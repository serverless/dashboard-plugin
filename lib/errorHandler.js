'use strict';

/*
 * Error Handler
 */

const serializeError = require('./serializeError');
const { getDashboardUrl } = require('./dashboard');
const { parseDeploymentData } = require('./deployment');

module.exports = function (ctx) {
  return async function (error) {
    /*
     * Error: Failed Deployment
     * - Handle failed deployments
     */

    ctx.sls.cli.log('Publishing service to the Serverless Dashboard...');

    const deployment = await parseDeploymentData(ctx, 'error', serializeError(error));

    await deployment.save();

    ctx.sls.cli.log(
      `Successfully published your service to the Serverless Dashboard: ${getDashboardUrl(ctx)}`
    );
    if (!ctx.state.deployment) {
      ctx.state.deployment = {};
    }
    ctx.state.deployment.complete = true;
  };
};
