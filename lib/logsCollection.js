'use strict';

const chalk = require('chalk');

/*
 * Logs Collection
 * - Collects `SERVERLESS PLATFORM || REPORT` from lambda logs
 * - Collects `sls-access-logs` from API Gateway access logs
 */

const {
  pickResourceType,
  upperFirst,
  API_GATEWAY_FILTER_PATTERN,
  LAMBDA_FILTER_PATTERN,
} = require('./utils');

const { getAccessKeyForTenant, getLogDestination } = require('@serverless/platform-sdk');

module.exports = async ctx => {
  if (
    ctx.sls.service.custom &&
    ctx.sls.service.custom.enterprise &&
    ctx.sls.service.custom.enterprise.collectLambdaLogs === false
  ) {
    ctx.sls.cli.log('Info: This plugin is not configured to collect AWS Lambda Logs.');
    return;
  }

  if (
    ctx.sls.service.custom &&
    ctx.sls.service.custom.enterprise &&
    ctx.sls.service.custom.enterprise.logIngestMode === 'poll'
  ) {
    ctx.sls.cli.log('Info: Log ingestion is configured to poll-based ingestion.');
    return;
  }

  const template = ctx.sls.service.provider.compiledCloudFormationTemplate;

  // Gather possible targets
  const logGroups = pickResourceType(template, 'AWS::Logs::LogGroup');
  if (logGroups.length === 0) {
    return;
  }

  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant);
  const { Account } = await ctx.provider.request('STS', 'getCallerIdentity', {});
  const destinationOpts = {
    accessKey,
    appUid: ctx.sls.service.appUid,
    tenantUid: ctx.sls.service.tenantUid,
    serviceName: ctx.sls.service.getServiceName(),
    stageName: ctx.provider.getStage(),
    regionName: ctx.provider.getRegion(),
    accountId: Account,
  };

  let destinationArn;

  try {
    ({ destinationArn } = await getLogDestination(destinationOpts));
  } catch (e) {
    if (e.message && e.message.includes('not supported in region')) {
      ctx.sls.cli.log(
        chalk.keyword('orange')(
          `Warning: Lambda log collection is not supported in ${ctx.provider.getRegion()}`
        )
      );
      return;
    }
    throw new Error(e.message);
  }

  // For each log group, set up subscription
  for (const logGroupIndex of Object.keys(logGroups)) {
    const logGroupKey = logGroups[logGroupIndex].key;
    let logGroupName = logGroups[logGroupIndex].resource.Properties.LogGroupName;

    if (typeof logGroupName === 'object') {
      if ('Fn::Join' in logGroupName) {
        logGroupName = logGroupName['Fn::Join'][1].join(logGroupName['Fn::Join'][0]);
      } else {
        continue;
      }
    }

    const filterPattern = logGroupName.startsWith('/aws/api-gateway/')
      ? API_GATEWAY_FILTER_PATTERN
      : LAMBDA_FILTER_PATTERN;

    template.Resources[`CloudWatchLogsSubscriptionFilter${upperFirst(logGroupKey)}`] = {
      Type: 'AWS::Logs::SubscriptionFilter',
      Properties: {
        DestinationArn: destinationArn,
        FilterPattern: filterPattern,
        LogGroupName: {
          Ref: logGroupKey,
        },
      },
    };
  }
};
