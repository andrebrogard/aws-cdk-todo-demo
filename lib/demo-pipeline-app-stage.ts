import { DemoAppStack } from './demo-app-stack'
import { Stage, Construct, StageProps, CfnOutput } from '@aws-cdk/core';

export class DemoPipelineAppStage extends Stage {
    public readonly apiUrl: CfnOutput
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const stage = new DemoAppStack(this, 'DemoAppStack');
        this.apiUrl = stage.apiUrl
    }
}