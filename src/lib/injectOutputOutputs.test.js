'use strict';

const injectOutputOutputs = require('./injectOutputOutputs');
jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('token')),
  getMetadata: jest.fn().mockReturnValue(Promise.resolve({ awsAccountId: '111111' })),
}));

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
    expect(ctx.sls.service.outputs).toEqual({ foo: 'bar', iamRole: 'CFN!?SFEOutputiamRole' });
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).toEqual({
      Outputs: {
        SFEOutputiamRole: {
          Description: `SFE output "iamRole"`,
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
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).toEqual({
      Outputs: {
        SFEOutputiamRole: {
          Description: `SFE output "iamRole"`,
          Value: { 'Fn::GetAtt': ['IamRoleLambdaExecution', 'Arn'] },
        },
      },
    });
    expect(ctx.sls.service.outputs).toEqual({ foo: 'bar', iamRole: 'CFN!?SFEOutputiamRole' });
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
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).toEqual({
      Outputs: {
        SFEOutputapig: {
          Description: `SFE output "apig"`,
          Value: { Ref: 'ApiGatewayRestId' },
        },
      },
    });
    expect(ctx.sls.service.outputs).toEqual({ foo: 'bar', apig: 'CFN!?SFEOutputapig' });
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
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).toEqual({
      Outputs: {},
    });
    expect(ctx.sls.service.outputs).toEqual({ foo: 'bar' });
  });
});
