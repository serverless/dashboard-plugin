/*
 * Lambda Logs Collection
 * - Collects `SERVERLESS PLATFORM |||` from lambda logs
 * - Optionally collects all logs (defaults to always for now)
 * - Capturing billing details (?)
 */

import { pickResourceType, upperFirst } from './utils'

import { getAccessKeyForTenant, getLogDestination } from '@serverless/platform-sdk'

export default async (ctx) => {
  if (
    ctx.sls.service.custom &&
    ctx.sls.service.custom.enterprise &&
    ctx.sls.service.custom.enterprise.collectLambdaLogs === false
  ) {
    ctx.sls.cli.log(
      'Info: This plugin is not configured to collect AWS Lambda Logs.',
      'Serverless Enterprise'
    )
    return
  }

  const template = ctx.sls.service.provider.compiledCloudFormationTemplate

  // Gather possible targets
  const lambdaLogGroups = pickResourceType(template, 'AWS::Logs::LogGroup')
  if (lambdaLogGroups.length == 0) {
    return
  }

  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant)
  const { Account } = await ctx.provider.request('STS', 'getCallerIdentity', {})
  const destinationOpts = {
    accessKey,
    appUid: ctx.sls.service.appUid,
    tenantUid: ctx.sls.service.tenantUid,
    serviceName: ctx.sls.service.getServiceName(),
    stageName: ctx.provider.getStage(),
    regionName: ctx.provider.getRegion(),
    accountId: Account
  }

  let destinationArn

  try {
    ;({ destinationArn } = await getLogDestination(destinationOpts))
  } catch (e) {
    if (e.message && e.message.includes('not supported in region')) {
      ctx.sls.cli.log(
        `Warning: Lambda log collection is not supported in ${ctx.provider.getRegion()}`
      )
      return
    }
    throw new Error(e.message)
  }

  // For each log group, set up subscription
  for (const lambdaLogGroupIndex in lambdaLogGroups) {
    const lambdaLogGroupKey = lambdaLogGroups[lambdaLogGroupIndex].key

    template.Resources[`CloudWatchLogsSubscriptionFilter${upperFirst(lambdaLogGroupKey)}`] = {
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
