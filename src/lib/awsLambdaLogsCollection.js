/*
 * Lambda Logs Collection
 * - Collects `SERVERLESS PLATFORM |||` from lambda logs
 * - Optionally collects all logs (defaults to always for now)
 * - Capturing billing details (?)
 */

import utils from './utils'

import { getLogDestination } from '@serverless/platform-sdk'

export default async (ctx) => {
  if (
    !ctx.sls.service.custom ||
    !ctx.sls.service.custom.platform ||
    !ctx.sls.service.custom.platform.collectLambdaLogs
  ) {
    ctx.sls.cli.log(
      'Info: The Serverless Platform Plugin is not configured to collect AWS Lambda Logs.'
    )
    return
  }

  const template = ctx.sls.service.provider.compiledCloudFormationTemplate

  // Gather possible targets
  const lambdaLogGroups = utils.pickResourceType(template, 'AWS::Logs::LogGroup')
  if (lambdaLogGroups.length == 0) {
    return
  }

  const { destinationArn } = await getLogDestination(ctx)

  // For each log group, set up subscription
  for (const lambdaLogGroupIndex in lambdaLogGroups) {
    const lambdaLogGroupKey = lambdaLogGroups[lambdaLogGroupIndex].key

    template.Resources[`CloudWatchLogsSubscriptionFilter${utils.upperFirst(lambdaLogGroupKey)}`] = {
      Type: 'AWS::Logs::SubscriptionFilter',
      Properties: {
        DestinationArn: destinationArn,
        FilterPattern: '{ $.origin = "sls-agent" }',
        LogGroupName: {
          Ref: lambdaLogGroupKey
        }
      }
    }
  }
}
