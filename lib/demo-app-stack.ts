import * as cdk from '@aws-cdk/core';
import * as dyndb from '@aws-cdk/aws-dynamodb'
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as ecr_assets from "@aws-cdk/aws-ecr-assets";
import { CfnOutput } from '@aws-cdk/core';


export class DemoAppStack extends cdk.Stack {
  public readonly apiUrl: CfnOutput

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
    // Defines a dynamodb table to store our ToDos
    const db = new dyndb.Table(this, 'Todos', {
      partitionKey: { name: 'id', type: dyndb.AttributeType.STRING },
    })

    // Defines an ECS cluster
    const cluster = new ecs.Cluster(this, 'Ec2Cluster', {  });

    // Create an AWS log driver
    const logging = new ecs.AwsLogDriver({
      streamPrefix: "myapp",
    })

    // Defines a Fargate task definition. 0.25 vcpu and 512 mb memory
    const taskDef = new ecs.FargateTaskDefinition(this, "MyTaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
    })

    // Need to grant our task definition permissions to access our dynamodb table
    db.grantReadWriteData(taskDef.taskRole)

    // Defines our docker image. Dockerfile is in the app/ directory
    const containerImage = ecs.ContainerImage.fromDockerImageAsset(new ecr_assets.DockerImageAsset(this, 'DockerImage', {
      directory: 'app'
    }))

    // Add contianer to task definition, add logging, define environment variables for the application in the docker container.
    taskDef.addContainer("AppContainer", {
      image: containerImage,
      environment: {
        TABLE_NAME: db.tableName,
        REGION: this.region,
        PORT: "80"
      },
      portMappings: [{containerPort: 80}],
      logging,
    })

    // Create the load balancer Fargate service. Asks for 2 instances of the task definition.
    // Creates a public loadbalancer without TLS. Will only accept http://.
    const apl = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'DemoALP', {
      taskDefinition: taskDef,
      cluster,
      desiredCount: 2,
      assignPublicIp: true,
      publicLoadBalancer: true,
    })


    this.apiUrl = new CfnOutput(this, 'LBDns', {
      value: apl.loadBalancer.loadBalancerDnsName
    })

  }
}
