'use strict';

const injectLogsIamRole = require('./injectLogsIamRole');
const { getAccessKeyForTenant, getMetadata } = require('@serverless/platform-sdk');

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('token')),
  getMetadata: jest.fn().mockReturnValue(Promise.resolve({ awsAccountId: '111111' })),
}));

describe('injectLogsIamRole', () => {
  it('adds IAM role for all the log groups created', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
      },
      Outputs: {},
    };
    const ctx = {
      sls: {
        service: {
          tenant: 'tenant',
          tenantUid: 'UID',
          provider: { compiledCloudFormationTemplate },
        },
      },
    };
    await injectLogsIamRole(ctx);
    expect(compiledCloudFormationTemplate).toEqual({
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
        EnterpriseLogAccessIamRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    AWS: 'arn:aws:iam::111111:root',
                  },
                  Action: 'sts:AssumeRole',
                  Condition: {
                    StringEquals: {
                      'sts:ExternalId': 'ServerlessEnterprise-UID',
                    },
                  },
                },
              ],
            },
            Policies: [
              {
                PolicyName: 'LogFilterAccess',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Action: ['logs:FilterLogEvents'],
                      Resource: [
                        {
                          'Fn::GetAtt': ['Foo', 'Arn'],
                        },
                        {
                          'Fn::GetAtt': ['Bar', 'Arn'],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      Outputs: {
        EnterpriseLogAccessIamRole: {
          Value: {
            'Fn::GetAtt': ['EnterpriseLogAccessIamRole', 'Arn'],
          },
        },
      },
    });
    expect(getAccessKeyForTenant).toBeCalledWith('tenant');
    expect(getMetadata).toBeCalledWith('token');
  });

  it('adds does not add role if user specified their own', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
      },
      Outputs: {},
    };
    const ctx = {
      sls: {
        service: {
          tenant: 'tenant',
          tenantUid: 'UID',
          provider: { compiledCloudFormationTemplate },
          custom: { enterprise: { logAccessIamRole: 'ARN' } },
        },
      },
    };
    await injectLogsIamRole(ctx);
    expect(compiledCloudFormationTemplate).toEqual({
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
      },
      Outputs: {},
    });
    expect(getAccessKeyForTenant).toBeCalledWith('tenant');
    expect(getMetadata).toBeCalledWith('token');
  });

  it('does not add IAM role when no log groups', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {},
      Outputs: {},
    };
    const ctx = {
      sls: {
        service: {
          tenant: 'tenant',
          tenantUid: 'UID',
          provider: { compiledCloudFormationTemplate },
        },
      },
    };
    await injectLogsIamRole(ctx);
    expect(compiledCloudFormationTemplate).toEqual({
      Resources: {},
      Outputs: {},
    });
  });
});
