/*
 * Error Handler
 */

import serializeError from 'serialize-error'
import { parseDeploymentData } from './deployment'

export default function(ctx) {
  return async function(error, id) { // eslint-disable-line
    /*
     * Error: Failed Deployment
     * - Handle failed deployments
     */

    ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...', 'Serverless Enterprise')

    const deployment = await parseDeploymentData(ctx, 'error', serializeError(error))

    const result = await deployment.save()

    ctx.sls.cli.log(
      `Successfully published your service to the Enterprise Dashboard: ${result.dashboardUrl}`, // eslint-disable-line
      'Serverless Enterprise'
    )
    if (!ctx.state.deployment) {
      ctx.state.deployment = {}
    }
    ctx.state.deployment.complete = true
  }
}
