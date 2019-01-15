/*
 * AWS API Gateway Logs Collection
 * - Collects all API Gateway logs
 */

import { pickResourceType, upperFirst } from './utils'

export default async (ctx) => {
  if (
    !ctx.sls.service.custom ||
    !ctx.sls.service.custom.platform ||
    !ctx.sls.service.custom.platform.collectApiLogs
  ) {
    return
  }

  ctx.sls.cli.log('Info: This plugin is collecting API Gateway logs.',
    'Serverless Enterprise')
  const logRoleLogicalName = 'IamRoleApiGatewayCloudwatchLogRole'
  const template = ctx.sls.service.provider.compiledCloudFormationTemplate

  const deployments = pickResourceType(template, 'AWS::ApiGateway::Deployment')

  template.Resources = {
    ...template.Resources,
    [logRoleLogicalName]: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['apigateway.amazonaws.com']
              },
              Action: ['sts:AssumeRole']
            }
          ]
        },
        Policies: [
          {
            PolicyName: `${ctx.sls.service.service}-apiGatewayLogs`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:DescribeLogGroups',
                    'logs:DescribeLogStreams',
                    'logs:PutLogEvents',
                    'logs:GetLogEvents',
                    'logs:FilterLogEvents'
                  ],
                  Resource: '*'
                }
              ]
            }
          }
        ],
        Path: '/'
      }
    },
    ApiGatewayAccount: {
      Type: 'AWS::ApiGateway::Account',
      Properties: {
        CloudWatchRoleArn: {
          'Fn::GetAtt': [logRoleLogicalName, 'Arn']
        }
      },
      DependsOn: [logRoleLogicalName]
    }
  }

  for (const deploymentIndex in deployments) {
    const deploymentKey = deployments[deploymentIndex].key
    const deployment = deployments[deploymentIndex].resource

    template.Resources[`ApiGatewayStage${upperFirst(deployment.Properties.StageName)}`] = {
      Type: 'AWS::ApiGateway::Stage',
      Properties: {
        StageName: deployment.Properties.StageName,
        Description: `${deployment.Properties.StageName} stage of ${ctx.sls.service.service}`,
        RestApiId: {
          Ref: 'ApiGatewayRestApi'
        },
        DeploymentId: {
          Ref: deploymentKey
        },
        MethodSettings: [
          {
            LoggingLevel: 'INFO',
            DataTraceEnabled: true,
            HttpMethod: '*',
            ResourcePath: '/*',
            MetricsEnabled: false
          }
        ]
      }
    }

    /*
     * Finally, this will make sure every stage's API details are published to to our Kinesis Streams
     */
    template.Resources[
      `CloudWatchLogsSubscriptionFilter${upperFirst(deployment.Properties.StageName)}`
    ] = {
      Type: 'AWS::Logs::SubscriptionFilter',
      Properties: {
        DestinationArn:
          'arn:aws:logs:us-east-1:377024778620:destination:ServerlessPlatformDemoAPIGatewayLogs',
        FilterPattern: '', // TODO: Make this only get what we want!
        LogGroupName: {
          'Fn::Sub': [
            'API-Gateway-Execution-Logs_${ApiGatewayId}/${StageName}',
            {
              ApiGatewayId: { Ref: 'ApiGatewayRestApi' },
              StageName: {
                Ref: `ApiGatewayStage${upperFirst(deployment.Properties.StageName)}`
              }
            }
          ]
        }
      }
    }

    template.Resources[deploymentKey] = deployment
    delete template.Resources[deploymentKey].Properties.StageName
  }
}
