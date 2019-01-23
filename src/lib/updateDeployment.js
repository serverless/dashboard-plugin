/*
 * Update Deployment
 */

import { updateDeployment, getAccessKeyForTenant, getServiceUrl } from '@serverless/platform-sdk'

export default async function(ctx) {
  // If deployment data is not on state, skip
  if (!ctx.state.deployment || !ctx.state.deployment.deploymentId) {
    return
  }

  // Defaults
  const accessKey = getAccessKeyForTenant(ctx.sls.service.tenant)

  ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...', 'Serverless Enterprise')

  const cfResources = await ctx.provider.getStackResources()
  const accountId = await ctx.provider.getAccountId()
  const deploymentData = {
    tenant: ctx.sls.service.tenant,
    app: ctx.sls.service.app,
    serviceName: ctx.sls.service.service,
    accessKey: accessKey,
    deploymentId: ctx.state.deployment.deploymentId,
    status: 'success',
    computedData: {
      accountId,
      apiId: ctx.state.deployment.apiId,
      physicalIds: cfResources.map((cfR) => ({
        logicalId: cfR.LogicalResourceId,
        physicalId: cfR.PhysicalResourceId
      }))
    }
  }

  await updateDeployment(deploymentData)
  // TODO: Track Stat

  const serviceUrlData = {
    tenant: deploymentData.tenant,
    app: deploymentData.app,
    name: deploymentData.serviceName
  }
  const serviceUrl = getServiceUrl(serviceUrlData)
  ctx.sls.cli.log(
        `Successfully published your service to the Enterprise Dashboard: ${serviceUrl}`, // eslint-disable-line
    'Serverless Enterprise'
  )

  // Mark deployment as complete
  ctx.state.deployment.complete = true
}
