#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { DemoPipelineStack } from '../lib/demo-pipeline-stack';
import { DemoAppStack } from '../lib/demo-app-stack';
const app = new cdk.App();

new DemoPipelineStack(app, 'DemoPipeline', {env:{region: 'us-east-1'}});
new DemoAppStack(app, 'DemoApp', {env:{region: 'us-east-1'}});
