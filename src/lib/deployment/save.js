/*
 * Save Deployment
 * - This uses the new deployment data model.
 */

import parseDeploymentData from './parse'

export default async function(ctx, archived = false) {
  if (ctx.sls.service.provider.shouldNotDeploy) {
    return
  }
  ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...', 'Serverless Enterprise')

  const deployment = await parseDeploymentData(ctx, undefined, undefined, archived)

  const result = await deployment.save()

  ctx.sls.cli.log(
        `Successfully published your service to the Enterprise Dashboard: ${result.dashboardUrl}`, // eslint-disable-line
    'Serverless Enterprise'
  )
}
