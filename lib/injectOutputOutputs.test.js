'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');

const injectOutputOutputs = proxyquire('./injectOutputOutputs', {
  '@serverless/platform-sdk': {
    getAccessKeyForTenant: async () => 'token',
    getMetadata: async () => ({ awsAccountId: '111111' }),
  },
});

describe('injectOutputOutputs', () => {
  it('adds cfn output for sfe output using Fn::Join', async () => {
    const ctx = {
      sls: {
        service: {
          outputs: {
            foo: 'bar',
            iamRole: { 'Fn::Join': ['', ['a', 'b']] },
          },
          provider: { compiledCloudFormationTemplate: { Outputs: {} } },
        },
      },
    };
    await injectOutputOutputs(ctx);
    expect(ctx.sls.service.outputs).to.deep.equal({ foo: 'bar', iamRole: 'CFN!?SFEOutputiamRole' });
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).to.deep.equal({
      Outputs: {
        SFEOutputiamRole: {
          Description: 'SFE output "iamRole"',
          Value: { 'Fn::Join': ['', ['a', 'b']] },
        },
      },
    });
  });

  it('adds cfn output for sfe output using Fn::GetAtt', async () => {
    const ctx = {
      sls: {
        service: {
          outputs: {
            foo: 'bar',
            iamRole: { 'Fn::GetAtt': ['IamRoleLambdaExecution', 'Arn'] },
          },
          provider: { compiledCloudFormationTemplate: { Outputs: {} } },
        },
      },
    };
    await injectOutputOutputs(ctx);
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).to.deep.equal({
      Outputs: {
        SFEOutputiamRole: {
          Description: 'SFE output "iamRole"',
          Value: { 'Fn::GetAtt': ['IamRoleLambdaExecution', 'Arn'] },
        },
      },
    });
    expect(ctx.sls.service.outputs).to.deep.equal({ foo: 'bar', iamRole: 'CFN!?SFEOutputiamRole' });
  });

  it('adds cfn output for sfe output using Ref', async () => {
    const ctx = {
      sls: {
        service: {
          outputs: {
            foo: 'bar',
            apig: { Ref: 'ApiGatewayRestId' },
          },
          provider: { compiledCloudFormationTemplate: { Outputs: {} } },
        },
      },
    };
    await injectOutputOutputs(ctx);
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).to.deep.equal({
      Outputs: {
        SFEOutputapig: {
          Description: 'SFE output "apig"',
          Value: { Ref: 'ApiGatewayRestId' },
        },
      },
    });
    expect(ctx.sls.service.outputs).to.deep.equal({ foo: 'bar', apig: 'CFN!?SFEOutputapig' });
  });

  it('adds nothing when unnecessary', async () => {
    const ctx = {
      sls: {
        service: {
          outputs: { foo: 'bar' },
          provider: { compiledCloudFormationTemplate: { Outputs: {} } },
        },
      },
    };
    await injectOutputOutputs(ctx);
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).to.deep.equal({
      Outputs: {},
    });
    expect(ctx.sls.service.outputs).to.deep.equal({ foo: 'bar' });
  });
});
