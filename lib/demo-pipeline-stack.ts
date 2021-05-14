import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { SimpleSynthAction, CdkPipeline, ShellScriptAction, CdkStage, StackOutput } from "@aws-cdk/pipelines";
import { DemoPipelineAppStage } from './demo-pipeline-app-stage'
import { CfnOutput } from '@aws-cdk/core';



export class DemoPipelineStack extends cdk.Stack {
  public readonly deployedAccount: CfnOutput

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    



    //const targetStageAccount = this.node.tryGetContext('targetStageAccount')

    // Defines the artifact representing the sourcecode
    const sourceArtifact = new codepipeline.Artifact(); 

    // Defines the artifact representing the cloud assembly 
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    // A CodeBuild Project to perform the unit testing of the app.
    const testProject = new codebuild.PipelineProject(this, 'DemoTestBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            "runtime-versions": {
              nodejs: '12.x'
            },
            commands: [
              'cd app',
              'npm i'
            ]
          },
          build: {
            commands: [
              'npm run test'
            ]
          }
        },
      }),
      environment:{
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      }
    })
    // A CodePipeline 
    const codePipeline = new codepipeline.Pipeline(this, 'DemoCodePipelineResource', { 
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              owner: 'andrebrogard',
              repo: 'aws-cdk-todo-node-multi-pipeline-ecs',
              oauthToken: cdk.SecretValue.secretsManager('PersonalGithubToken'), 
              actionName: 'GithubCode', // Any Git-based source control
              output: sourceArtifact, // Indicates where the artifact is stored
              branch: 'main',
            })
          ]
        },
        {
          stageName: 'Test',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              input: sourceArtifact,
              project: testProject,
              type: codepipeline_actions.CodeBuildActionType.TEST,
              actionName: 'AppTest',
            })
          ]
        }
      ]
    })

    
    // Target accounts
    const targetDevAccount = this.node.tryGetContext('targetDevAccount') // eg. 222222222222
    const targetProdAccount = this.node.tryGetContext('targetProdAccount') // eg. 333333333333
    
    // An @aws-cdk/pipelines Pipeline, uses the previous defined codePipeline in order to add deployment stages to it.
    // It also adds the synthaction that is used to update the pipeline.
    const pipeline = new CdkPipeline(this, 'DemoPipelineResource', {
      cloudAssemblyArtifact,
      codePipeline,
      // Builds our source cdk code outlined above into a cloud assembly artifact
      synthAction: SimpleSynthAction.standardNpmSynth({
          sourceArtifact, // Where to get source code to build
          synthCommand: "npx cdk synth DemoPipeline",
          cloudAssemblyArtifact // Where to place built source
      })
    })

    // Deploy to Dev account

    const devDeploy = new DemoPipelineAppStage(this, 'DemoDevDeployment', {env: {account: targetDevAccount}})

    const devStage = pipeline.addApplicationStage(devDeploy)
    
    // Manual approval in wait for test suite to run
    devStage.addManualApprovalAction({
      actionName: 'DevToProdApproval'
    })

  
    // Deploy to Prod account
    const prodDeploy = new DemoPipelineAppStage(this, 'DemoProdDeployment', {env: {account: targetProdAccount}})
    
    pipeline.addApplicationStage(prodDeploy)
  }
}
