'use strict';

const { urls } = require('@serverless/platform-sdk');

module.exports.getDashboardUrl = ctx => {
  let dashboardUrl = urls.frontendUrl;
  if (ctx.sls.enterpriseEnabled) {
    dashboardUrl += `tenants/${ctx.sls.service.org}/`;
    dashboardUrl += `applications/${ctx.sls.service.app}/`;
    dashboardUrl += `services/${ctx.sls.service.service}/`;
    dashboardUrl += `stage/${ctx.provider.getStage()}/`;
    dashboardUrl += `region/${ctx.provider.getRegion()}`;
  }
  return dashboardUrl;
};
