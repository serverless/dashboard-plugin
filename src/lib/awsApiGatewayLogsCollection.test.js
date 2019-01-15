import awsApiGatewayLogsCollection from './awsApiGatewayLogsCollection'

describe('awsApiGatewayLogsCollection', () => {
  it('adds log subscription filter to template', async () => {
    const log = jest.fn()
    const ctx = {
      sls: {
        cli: { log },
        service: {
          tenant: 'tenant',
          app: 'app',
          custom: { enterprise: { collectApiLogs: true } },
          provider: {
            compiledCloudFormationTemplate: {
              Resources: {
                ApigDeployment: {
                  Type: 'AWS::ApiGateway::Deployment',
                  Properties: { StageName: 'stage' }
                }
              }
            }
          }
        },
        provider: {}
      }
    }
    const that = { serverless: { classes: { Error } } }
    await awsApiGatewayLogsCollection.bind(that)(ctx)
    expect(log).toBeCalledWith('Info: This plugin is collecting API Gateway logs.', 'Serverless Enterprise')
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).toEqual({
      Resources: {
        ApiGatewayAccount: {
          DependsOn: ['IamRoleApiGatewayCloudwatchLogRole'],
          Properties: {
            CloudWatchRoleArn: { 'Fn::GetAtt': ['IamRoleApiGatewayCloudwatchLogRole', 'Arn'] }
          },
          Type: 'AWS::ApiGateway::Account'
        },
        ApiGatewayStageStage: {
          Properties: {
            DeploymentId: { Ref: 'ApigDeployment' },
            Description: 'stage stage of undefined',
            MethodSettings: [
              {
                DataTraceEnabled: true,
                HttpMethod: '*',
                LoggingLevel: 'INFO',
                MetricsEnabled: false,
                ResourcePath: '/*'
              }
            ],
            RestApiId: { Ref: 'ApiGatewayRestApi' },
            StageName: 'stage'
          },
          Type: 'AWS::ApiGateway::Stage'
        },
        ApigDeployment: { Properties: {}, Type: 'AWS::ApiGateway::Deployment' },
        CloudWatchLogsSubscriptionFilterStage: {
          Properties: {
            DestinationArn:
              'arn:aws:logs:us-east-1:377024778620:destination:ServerlessPlatformDemoAPIGatewayLogs',
            FilterPattern: '',
            LogGroupName: {
              'Fn::Sub': [
                'API-Gateway-Execution-Logs_${ApiGatewayId}/${StageName}',
                {
                  ApiGatewayId: { Ref: 'ApiGatewayRestApi' },
                  StageName: { Ref: 'ApiGatewayStageStage' }
                }
              ]
            }
          },
          Type: 'AWS::Logs::SubscriptionFilter'
        },
        IamRoleApiGatewayCloudwatchLogRole: {
          Properties: {
            AssumeRolePolicyDocument: {
              Statement: [
                {
                  Action: ['sts:AssumeRole'],
                  Effect: 'Allow',
                  Principal: { Service: ['apigateway.amazonaws.com'] }
                }
              ],
              Version: '2012-10-17'
            },
            Path: '/',
            Policies: [
              {
                PolicyDocument: {
                  Statement: [
                    {
                      Action: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:DescribeLogGroups',
                        'logs:DescribeLogStreams',
                        'logs:PutLogEvents',
                        'logs:GetLogEvents',
                        'logs:FilterLogEvents'
                      ],
                      Effect: 'Allow',
                      Resource: '*'
                    }
                  ],
                  Version: '2012-10-17'
                },
                PolicyName: 'undefined-apiGatewayLogs'
              }
            ]
          },
          Type: 'AWS::IAM::Role'
        }
      }
    })
  })
})
