import injectLogsIamRole from './injectLogsIamRole'
import { getAccessKeyForTenant, getMetadata } from '@serverless/platform-sdk'

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('token')),
  getMetadata: jest.fn().mockReturnValue(Promise.resolve({ awsAccountId: '111111' }))
}))

describe('injectLogsIamRole', () => {
  it('adds IAM role for all the log groups created', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' }
      },
      Outputs: {}
    }
    const ctx = {
      sls: {
        service: {
          tenant: 'tenant',
          tenantUid: 'UID',
          provider: { compiledCloudFormationTemplate }
        }
      }
    }
    await injectLogsIamRole(ctx)
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
                    AWS: `arn:aws:iam::111111:root`
                  },
                  Action: 'sts:AssumeRole',
                  Condition: {
                    StringEquals: {
                      'sts:ExternalId': `ServerlessEnterprise-UID`
                    }
                  }
                }
              ]
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
                          'Fn::Sub':
                            'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:${Foo}'
                        },
                        {
                          'Fn::Sub':
                            'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:${Bar}'
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
      },
      Outputs: {
        EnterpriseLogAccessIamRole: {
          Value: {
            Ref: 'EnterpriseLogAccessIamRole'
          }
        }
      }
    })
    expect(getAccessKeyForTenant).toBeCalledWith('tenant')
    expect(getMetadata).toBeCalledWith('token')
  })
})
