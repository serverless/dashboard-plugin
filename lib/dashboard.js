'use strict';

const dashboardUrl =
  process.env.SERVERLESS_PLATFORM_STAGE === 'dev'
    ? 'https://app.serverless-dev.com/'
    : 'https://app.serverless.com/';

module.exports.getDashboardUrl = (ctx) => {
  if (!ctx.sls.enterpriseEnabled) return dashboardUrl;
  const { service } = ctx.sls;
  return `${dashboardUrl}${service.org}/apps/${service.app}/${
    service.service
  }/${ctx.provider.getStage()}/${ctx.provider.getRegion()}`;
};
