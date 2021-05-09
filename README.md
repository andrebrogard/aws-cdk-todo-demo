# aws-cdk-todo-node-multi-pipeline-ecs

## Purpose

This repo serves as a sample application of AWS CDK in an organization. The pipeline aims to provide continous integration and deployment on a minimalistic sample ToDo app, which could be any microservice or application.

## Prerequisities

To try out the code in this repo you need
* Several AWS accounts with basically full access. I advise to use accounts in an AWS organization. This demo uses 4 accounts. It is possible to use fewer. 
* to install AWS CLI and AWS CDK and configure your credentials such that you have access to each account through the cli.

To try out the application locally you would need:
* nodejs 12.x (earlier or later most likely ok, but not tested)
* Docker (optional)

To understand what is happening, i recommend to be familiar with:
* AWS CodeBuild, CodePipeline, Cloudformation
* AWS ECS, Load Balancers
* Infrastructure as Code, Stacks.

## Accounts

This demo uses 4 AWS accounts, they are named Tools, Development, Staging and Production. Tools holds all the resources to deploy into Dev, Staging and Production. It is where the code is build and unit tested, using AWS CodeBuild, and it is where the pipeline resides.

## Pipeline

What does the pipeline do exactly? The pipeline is only deployed to the Tools account. The pipeline will fetch the source code and perform unit tests. Then it will update itself(the pipeline) and deploy the application stack into the Staging account. Next follows some validation tests and then with manual approval it can be deployed to the Production account. 

The application stack is defined seperately, but is used as a configureable module withing the pipeline. It builds the Docker image of the app/ directory and launches this application in AWS ECS as a Fargate service. Two instances of the applicaiton will be run under an elastic load balancer.

## Note

This demo uses experimental features of AWS CDK 1.101.0. More specifically, it uses the aws-cdk/pipelines module, which is a framework for writing pipelines on top of AWS CodePipeline. This framwork creates more resources behind the scenes and most importantly, for this demo, simplifies the provisioning of permissions resources for cross-account deployments and works more closely with the cdk bootstraping resources.

I am however fairly confident that AWS CDK will continue in the same direction and keep these experimental features. It is however likely to be  some differences to later versions.

## Getting started

You need to fork or copy this repository to your own. The pipeline assumes a github source and you must have push rights to it. It is currently set to this repository, you will change this. More on this below. 

### AWS Setup

To deploy the pipeline, we first need to bootstrap our environments. The Staging and Production environments must be bootstrap with a trust flag to our Tools account. 

Assume for this demo that the these are the AWS account numbers, there is also AWS CLI profiles configured for each of these accounts: 
* Tools account: 111111111111
* Development account: 222222222222
* Staging account: 333333333333
* Production account: 444444444444

Note: Make sure that you have a default region set in your config file for AWS CLI.

In the below commands the profiles are named as `devuser`, `toolsuser` a.s.o.

## Code changes

Add to the `cdk.context.json` file the target account numbers. It should look like:

```
{
    "targetDevAccount": 222222222222,
    "targetStageAccount": 333333333333,
    "targetProdAccount": 444444444444
}
```

Also, create a Oauth token (with scopes `repo` and `admin:repo_hook`) to your github account where your forked or copied repo is. Add this token to secretsmanager as follows: 

```
aws secretsmanager create-secret --name PersonalGithubToken --secret-string XYZ... --profile toolsuser
```
Note: that your secret is unique to an aws account and region. You will have to run `aws configure --profile toolsuser` to set default region if you haven't already.

Make sure to update the `GitHubSourceAction` in `mvp-pipeline-stack.ts` with correct values of the repo owner, name and branch.

## Bootstraping
The experimental framework requires that we add 
```
"@aws-cdk/core:newStyleStackSynthesis": true
```
to the cdk.json (already added). This is to create more resources to handle permissions.

The bootstrap commands is only valid for one environment, namely the default one. To bootstrap more enviroments, specify more regions. See the bootstrap documentation.

Note: use `npx cdk` below if not installed globally

### Tools
To bootstrap the Tools account, run: 
```
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --profile toolsuser
```

### Development, Staging and Production

To bootstrap the other accounts, run: 
```
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --profile stageuser --trust 111111111111
```
Then also run this command with the development and production profile. This creates IAM roles that the pipeline in the tools account may assume, because of the 'trust' flag.

## Deployment

To deploy the pipeline. Make sure to push the repositiory to github with the correct context values. Then run:

```
cdk deploy DemoPipeline --profile toolsuser
```

This command only needs to be run once, to create the pipeline. Check the console to see it in action. It will trigger a deployment once it is provisioned. 

Now for every push to the main branch, it will trigger a deployment in the pipeline.

## Cleanup

First, destroy the pipeline by running: 

```
cdk destroy DemoPipeline --profile toolsuser
```
Destroying the pipeline will destroy the stacks that the pipeline has provisioned to dev, stage and prod. You need to remove all stacks that have been provisioned yourself. 

In cloudformation, delete the Application stacks in all accounts, delete the pipeline stack. 

