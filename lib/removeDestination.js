'use strict';

const { getAccessKeyForTenant, removeLogDestination } = require('@serverless/platform-sdk');

module.exports = async (ctx) => {
  if (
    !ctx.sls.service.custom ||
    !ctx.sls.service.custom.enterprise ||
    !ctx.sls.service.custom.enterprise.collectLambdaLogs
  ) {
    return;
  }
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.org);
  const destinationOpts = {
    accessKey,
    appUid: ctx.sls.service.appUid,
    tenantUid: ctx.sls.service.orgUid,
    serviceName: ctx.sls.service.getServiceName(),
    stageName: ctx.provider.getStage(),
    regionName: ctx.provider.getRegion(),
  };

  await removeLogDestination(destinationOpts);
  return;
};
