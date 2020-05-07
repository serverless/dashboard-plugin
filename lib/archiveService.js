'use strict';

/*
 * Archive Service
 */

const { archiveService, getAccessKeyForTenant } = require('@serverless/platform-sdk');

module.exports = async function (ctx) {
  // Defaults
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.org);

  ctx.sls.cli.log('Archiving this service in the Serverless Dashboard...');

  const data = {
    name: ctx.sls.service.service,
    tenant: ctx.sls.service.org,
    app: ctx.sls.service.app,
    provider: ctx.sls.service.provider.name,
    region: ctx.sls.service.provider.region,
    accessKey,
  };

  return archiveService(data)
    .then(() => {
      ctx.sls.cli.log('Successfully archived this service in the Serverless Dashboard...');
    })
    .catch((err) => {
      ctx.sls.cli.log('Failed to archive this service in the Serverless Dashboard...');
      throw new Error(err);
    });
};
