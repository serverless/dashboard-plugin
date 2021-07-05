'use strict';

module.exports = async function (ctx) {
  const {
    provider: { options },
    sls: {
      service: { service, appUid, orgUid },
    },
  } = ctx;

  ctx.sls.service.provider.environment = Object.assign({}, ctx.sls.service.provider.environment, {
    SLS_SERVICE: service,
    SLS_APP_UID: appUid,
    SLS_ORG_UID: orgUid,
    SLS_STAGE: (options && options.stage) || 'dev',
  });

  return;
};
