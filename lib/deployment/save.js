'use strict';

/*
 * Save Deployment
 * - This uses the new deployment data model.
 */

const { legacy } = require('@serverless/utils/log');
const { getDashboardUrl } = require('../dashboard');
const parseDeploymentData = require('./parse');

module.exports = async function (ctx, archived = false) {
  legacy.log('Publishing service to the Serverless Dashboard...');

  const deployment = await parseDeploymentData(ctx, undefined, undefined, archived);

  await deployment.save();

  legacy.log(
    `Successfully published your service to the Serverless Dashboard: ${getDashboardUrl(ctx)}`
  );
};
