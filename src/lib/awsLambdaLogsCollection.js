/*
 * Lambda Logs Collection
 * - Collects `SERVERLESS PLATFORM |||` from lambda logs
 * - Optionally collects all logs (defaults to always for now)
 * - Capturing billing details (?)
 */

const utils = require('./utils')

module.exports = async (ctx) => {
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

  const stageSettings = ctx.sls.service.custom.stageSettings || {}
  const template = ctx.sls.service.provider.compiledCloudFormationTemplate
  const config = ctx.sls.service.custom.platform || {}
  const {
    collectLambdaLogs = false,
    cloudwatchApmTransport = true,
    httpApmTransport = false
  } = config

  // Gather possible targets
  const lambdaLogGroups = utils.pickResourceType(template, 'AWS::Logs::LogGroup')

  // For each log group, set up subscription
  for (lambdaLogGroupIndex in lambdaLogGroups) {
    const lambdaLogGroupKey = lambdaLogGroups[lambdaLogGroupIndex].key
    const lambdaLogGroup = lambdaLogGroups[lambdaLogGroupIndex].resource

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

  // TODO if collecting all logs is disabled, but we still want APM, handle this case
  //
  //   if (cloudwatchApmTransport === false || httpApmTransport === true) {
  //     ctx.sls.cli.log(
  //       'Info: The Serverless Platform Plugin is configured to use the HTTP transport for APM instead (less optimal).'
  //     )
  //   } else {

  //   }
}
