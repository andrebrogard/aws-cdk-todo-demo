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

    const targetDevAccount = this.node.tryGetContext('targetDevAccount')
    const targetStageAccount = this.node.tryGetContext('targetStageAccount')
    const targetProdAccount = this.node.tryGetContext('targetProdAccount')

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
              repo: 'aws-cdk-todo-demo',
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

    const devDeploy : DemoPipelineAppStage = new DemoPipelineAppStage(this, 'DemoDevDeployment', {env: {account: targetDevAccount}})

    const devStage : CdkStage =  pipeline.addApplicationStage(devDeploy)
    
    devStage.addManualApprovalAction({
      actionName: 'DevToStagingApproval'
    })


    // Deploy to Stage account
    const stagingDeploy : DemoPipelineAppStage = new DemoPipelineAppStage(this, 'DemoStagingDeployment', {env: {account: targetStageAccount}})

    const stagingStage : CdkStage =  pipeline.addApplicationStage(stagingDeploy)

    stagingStage.addManualApprovalAction({
      actionName: 'StagingToProdApproval',
      
    })
  
    // Deploy to Prod account
    const prodDeploy : DemoPipelineAppStage = new DemoPipelineAppStage(this, 'DemoProdDeployment', {env: {account: targetProdAccount}})
    
    pipeline.addApplicationStage(prodDeploy)
  }
}
