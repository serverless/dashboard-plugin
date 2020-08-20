'use strict';

/*
 * Save Deployment
 * - This uses the new deployment data model.
 */

const { getDashboardUrl } = require('../dashboard');
const parseDeploymentData = require('./parse');

module.exports = async function (ctx, archived = false) {
  ctx.sls.cli.log('Publishing service to the Serverless Dashboard...');

  const deployment = await parseDeploymentData(ctx, undefined, undefined, archived);

  await deployment.save();

  ctx.sls.cli.log(
    `Successfully published your service to the Serverless Dashboard: ${getDashboardUrl(ctx)}`
  );
};
