/*
 * Error Handler
 */

import { updateDeployment, getAccessKeyForTenant } from '@serverless/platform-sdk'

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

    // Defaults
    const accessKey = await getAccessKeyForTenant(ctx.state.tenant)

    ctx.sls.cli.log(
      'Deployment failed.  Saving status to the Enterprise Dashboard...',
      'Serverless Enterprise'
    )

    const deploymentData = {
      tenant: ctx.state.tenant,
      app: ctx.state.app,
      serviceName: ctx.state.service,
      deploymentId: ctx.state.deployment.deploymentId,
      accessKey: accessKey,
      status: 'Failed'
    }
    return updateDeployment(deploymentData).then(() => {
      ctx.state.deployment.complete = true
    })
  }
}
