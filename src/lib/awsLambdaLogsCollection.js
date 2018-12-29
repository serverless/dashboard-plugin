/*
 * Lambda Logs Collection
 * - Collects Lambda logs with a top-level key of "origin": "sls-agent"
 */

const utils = require('./utils')

const { getDestination } = require('./destinations')

module.exports = async (ctx) => {

  if (!ctx.sls.service.custom
    || !ctx.sls.service.custom.platform
    || !ctx.sls.service.custom.platform.collectLambdaLogs) {
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
  if (lambdaLogGroups.length == 0 ) {
    return
  }

  const { destinationArn } = await getDestination(ctx)

  // For each log group, set up subscription
  for (lambdaLogGroupIndex in lambdaLogGroups) {
    const lambdaLogGroupKey = lambdaLogGroups[lambdaLogGroupIndex].key
    const lambdaLogGroup = lambdaLogGroups[lambdaLogGroupIndex].resource

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
