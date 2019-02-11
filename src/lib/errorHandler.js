/*
 * Error Handler
 */

import { parseDeploymentData } from './saveDeployment'

export default function(ctx) {
  return async function(error, id) { // eslint-disable-line
    /*
     * Error: Failed Deployment
     * - Handle failed deployments
     */

    // Check for an in-progress deployment
    if (
      !ctx.state.deployment ||
      !ctx.state.deployment.deploymentId ||
      ctx.state.deployment.complete
    ) {
      return Promise.resolve(error)
    }
    ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...', 'Serverless Enterprise')

    let deployment
    try {
      deployment = await parseDeploymentData(ctx, 'error')
    } catch (err) {
      throw new Error(err)
    }

    const result = await deployment.save()

    ctx.sls.cli.log(
      `Successfully published your service to the Enterprise Dashboard: ${result.dashboardUrl}`, // eslint-disable-line
      'Serverless Enterprise'
    )
    ctx.state.deployment.complete = true
  }
}
