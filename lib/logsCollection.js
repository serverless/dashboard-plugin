'use strict';

const { inspect } = require('util');
const log = require('./log');

/*
 * Logs Collection
 * - Collects `SERVERLESS PLATFORM || REPORT` from lambda logs
 * - Collects `sls-access-logs` from API Gateway access logs
 */

const {
  pickResourceType,
  upperFirst,
  API_GATEWAY_FILTER_PATTERN,
  API_GATEWAY_V2_FILTER_PATTERN,
  LAMBDA_FILTER_PATTERN,
} = require('./utils');

const { getPlatformClientWithAccessKey } = require('./client-utils');

const formatRegionName = (regionName) => {
  return regionName
    .split('-')
    .map((part) => upperFirst(part))
    .join('');
};

module.exports = async (ctx) => {
  if (
    ctx.sls.service.custom &&
    ctx.sls.service.custom.enterprise &&
    ctx.sls.service.custom.enterprise.collectLambdaLogs === false
  ) {
    log.info('This plugin is not configured to collect AWS Lambda Logs.');
    return;
  }

  if (
    ctx.sls.service.custom &&
    ctx.sls.service.custom.enterprise &&
    ctx.sls.service.custom.enterprise.logIngestMode === 'pull'
  ) {
    log.info('Log ingestion is configured to pull-based ingestion.');
    return;
  }

  const template = ctx.sls.service.provider.compiledCloudFormationTemplate;

  // Gather possible targets
  const logGroups = pickResourceType(template, 'AWS::Logs::LogGroup');
  if (logGroups.length === 0) {
    return;
  }

  const { Account } = await ctx.provider.request('STS', 'getCallerIdentity', {});
  const destinationOpts = {
    appUid: ctx.sls.service.appUid,
    orgUid: ctx.sls.service.orgUid,
    serviceName: ctx.sls.service.getServiceName(),
    stageName: ctx.provider.getStage(),
    regionName: ctx.provider.getRegion(),
    accountId: Account,
  };

  let destinationArn;

  try {
    const sdk = await getPlatformClientWithAccessKey(ctx.sls.service.org);
    ({ destinationArn } = await sdk.logDestinations.getOrCreate(destinationOpts));
  } catch (e) {
    if (e.message && e.message.includes('not supported in region')) {
      log.warning(`Lambda log collection is not supported in ${ctx.provider.getRegion()}`);
      return;
    }
    throw e;
  }

  // For each log group, set up subscription
  for (const logGroupIndex of Object.keys(logGroups)) {
    const logGroupKey = logGroups[logGroupIndex].key;
    let logGroupName = logGroups[logGroupIndex].resource.Properties.LogGroupName;

    if (typeof logGroupName !== 'string') {
      if (!logGroupName || !logGroupName['Fn::Join']) {
        throw new ctx.sls.classes.Error(
          `Unable to resolve '${logGroupIndex}' log group name out of: ${inspect(
            logGroups[logGroupIndex].resource.Properties
          )}`,
          'CANNOT_RESOLVE_LOG_GROUP'
        );
      }
      if (logGroupName['Fn::Join']) {
        logGroupName = logGroupName['Fn::Join'][1].join(logGroupName['Fn::Join'][0]);
      } else {
        continue;
      }
    }

    let filterPattern = LAMBDA_FILTER_PATTERN;
    if (logGroupName.startsWith('/aws/api-gateway/')) {
      filterPattern = API_GATEWAY_FILTER_PATTERN;
    } else if (logGroupName.startsWith('/aws/http-api/')) {
      filterPattern = API_GATEWAY_V2_FILTER_PATTERN;
    }

    template.Resources[
      `CWLSubFilter${upperFirst(logGroupKey)}${formatRegionName(destinationOpts.regionName)}`
    ] = {
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
