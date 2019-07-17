'use strict';

/*
 * Error Handler
 */

const serializeError = require('./serializeError');
const { parseDeploymentData } = require('./deployment');

module.exports = function(ctx) {
  return async function(error) {
    /*
     * Error: Failed Deployment
     * - Handle failed deployments
     */

    ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...', 'Serverless Enterprise');

    const deployment = await parseDeploymentData(ctx, 'error', serializeError(error));

    const result = await deployment.save();

    ctx.sls.cli.log(
      `Successfully published your service to the Enterprise Dashboard: ${result.dashboardUrl}`,
      'Serverless Enterprise'
    );
    if (!ctx.state.deployment) {
      ctx.state.deployment = {};
    }
    ctx.state.deployment.complete = true;
  };
};
