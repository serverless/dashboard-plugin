/*
 * Lambda Logs Collection
 * - Collects `SERVERLESS PLATFORM |||` from lambda logs
 * - Optionally collects all logs (defaults to always for now)
 * - Capturing billing details (?)
 */

import utils from './utils'

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

  // For each log group, set up subscription
  for (const lambdaLogGroupIndex in lambdaLogGroups) {
    const lambdaLogGroupKey = lambdaLogGroups[lambdaLogGroupIndex].key

    template.Resources[`CloudWatchLogsSubscriptionFilter${utils.upperFirst(lambdaLogGroupKey)}`] = {
      Type: 'AWS::Logs::SubscriptionFilter',
      Properties: {
        DestinationArn:
          'arn:aws:logs:us-east-1:377024778620:destination:ServerlessPlatformDemoLambdaLogs',
        FilterPattern: '', // TODO: Make this only get what we want!
        LogGroupName: {
          Ref: lambdaLogGroupKey
        }
      }
    }
  }

  /*
  const config = ctx.sls.service.custom.platform || {}
  const {
    collectLambdaLogs = false,
    cloudwatchApmTransport = true,
    httpApmTransport = false
  } = config
  */
  // TODO if collecting all logs is disabled, but we still want APM, handle this case
  //
  //   if (cloudwatchApmTransport === false || httpApmTransport === true) {
  //     ctx.sls.cli.log(
  //       'Info: The Serverless Platform Plugin is configured to use the HTTP transport for APM instead (less optimal).'
  //     )
  //   } else {

  //   }
}
