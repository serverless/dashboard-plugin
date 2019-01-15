/*
* Update Deployment
*/

import {
  updateDeployment,
  getLoggedInUser,
  getAccessKeyForTenant,
  getServiceUrl,
} from '@serverless/platform-sdk'
const fs = require('fs')
const os = require('os')
const path = require('path')

export default async function (ctx) {

  // If deployment data is not on state, skip
  if (!ctx.state.deployment || !ctx.state.deployment.deploymentId) {
    return
  }

  // Defaults
  const user = getLoggedInUser()
  const accessKey = getAccessKeyForTenant(ctx.state.tenant)
  let cfResources

  ctx.sls.cli.log(
    'Publishing service to the Enterprise Dashboard...',
    'Serverless Enterprise'
  )

  return ctx.provider.getStackResources()
  .then(resources => {
    cfResources = resources
  })
  .then(() => ctx.provider.getAccountId())
  .then(accountId => {
    const deploymentData = {
      tenant: ctx.state.tenant,
      app: ctx.state.app,
      serviceName: ctx.state.service,
      accessKey: accessKey,
      deploymentId: ctx.state.deployment.deploymentId,
      status: 'success',
      computedData: {
        accountId,
        apiId: ctx.state.deployment.apiId,
        physicalIds: cfResources.map(r => ({
          logicalId: r.LogicalResourceId,
          physicalId: r.PhysicalResourceId,
        })),
      },
    }

    return updateDeployment(deploymentData)
    .then((data) => {

      // TODO: Track Stat

      const serviceUrlData = {
        tenant: deploymentData.tenant,
        app: deploymentData.app,
        name: deploymentData.serviceName,
      }
      const serviceUrl = getServiceUrl(serviceUrlData)
      ctx.sls.cli.log(
        `Successfully published your service to the Enterprise Dashboard: ${serviceUrl}`, // eslint-disable-line
        'Serverless Enterprise'
      )
    })
  })
}
