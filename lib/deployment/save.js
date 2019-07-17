'use strict';

/*
 * Save Deployment
 * - This uses the new deployment data model.
 */

const parseDeploymentData = require('./parse');

module.exports = async function(ctx, archived = false) {
  ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...');

  const deployment = await parseDeploymentData(ctx, undefined, undefined, archived);

  const result = await deployment.save();

  ctx.sls.cli.log(
    `Successfully published your service to the Enterprise Dashboard: ${result.dashboardUrl}` // eslint-disable-line
  );
};
