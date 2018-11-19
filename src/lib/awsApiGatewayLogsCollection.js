/*
 * AWS API Gateway Logs Collection
 * - Collects all API Gateway logs
 */

const utils = require('./utils')

module.exports = async (ctx) => {
  if (!ctx.sls.service.custom.platform && !ctx.sls.service.custom.platform.collectApiLogs) {
    ctx.sls.cli.log(
      'Info: The Serverless Platform Plugin is not configured to collect API Gateway Logs.'
    )
    return
  }

  ctx.sls.cli.log('Info: The Serverless Platform is collecting API Gateway logs!')
  const logRoleLogicalName = 'IamRoleApiGatewayCloudwatchLogRole'
  const stageSettings = ctx.sls.service.custom.stageSettings || {}
  const template = ctx.sls.service.provider.compiledCloudFormationTemplate

  const deployments = utils.pickResourceType(template, 'AWS::ApiGateway::Deployment')

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

  for (deploymentIndex in deployments) {
    const deploymentKey = deployments[deploymentIndex].key
    const deployment = deployments[deploymentIndex].resource

    template.Resources[`ApiGatewayStage${utils.upperFirst(deployment.Properties.StageName)}`] = {
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
      `CloudWatchLogsSubscriptionFilter${utils.upperFirst(deployment.Properties.StageName)}`
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
              StageName: { Ref: `ApiGatewayStage${utils.upperFirst(deployment.Properties.StageName)}` }
            }
          ]
        }
      }
    }

    template.Resources[deploymentKey] = deployment
    delete template.Resources[deploymentKey].Properties.StageName
  }
}
