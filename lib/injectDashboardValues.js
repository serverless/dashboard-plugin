'use strict';

module.exports = async function (ctx) {
  const {
    provider: { options },
    sls: {
      service: { service, appUid, orgUid, app, org },
    },
  } = ctx;

  const accountId = await ctx.provider.getAccountId();

  ctx.sls.service.provider.environment = Object.assign({}, ctx.sls.service.provider.environment, {
    SERVERLESS_SERVICE: service,
    SERVERLESS_DASHBOARD_APP_UID: appUid,
    SERVERLESS_DASHBOARD_APP_NAME: app,
    SERVERLESS_DASHBOARD_ORG_NAME: org,
    SERVERLESS_DASHBOARD_ORG_UID: orgUid,
    SERVERLESS_STAGE: (options && options.stage) || 'dev',
    SERVERLESS_AWS_ACCOUNT_ID: accountId,
  });
};
