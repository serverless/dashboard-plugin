'use strict';

module.exports = function (ctx) {
  const {
    provider: { options },
    sls: {
      service: { service, appUid, orgUid },
    },
  } = ctx;

  ctx.sls.service.provider.environment = Object.assign({}, ctx.sls.service.provider.environment, {
    SERVERLESS_SERVICE: service,
    SERVERLESS_DASHBOARD_APP_UID: appUid,
    SERVERLESS_DASHBOARD_ORG_UID: orgUid,
    SERVERLESS_STAGE: (options && options.stage) || 'dev',
  });
};
