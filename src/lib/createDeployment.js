import { createDeployment, getLoggedInUser, getAccessKeyForTenant } from '@serverless/platform-sdk'
const fs = require('fs')
const path = require('path')

export default async function(ctx) {
  // Defaults
  const user = getLoggedInUser()
  const accessKey = getAccessKeyForTenant(ctx.state.tenant)

  // Fetch "serverless-state.json", which is only available during certain hooks.
  const serverlessStateFilePath = path.join(
    ctx.sls.config.servicePath,
    '.serverless',
    'serverless-state.json'
  )
  let serverlessStateFile = fs.readFileSync(serverlessStateFilePath, 'utf8')
  serverlessStateFile = serverlessStateFile ? JSON.parse(serverlessStateFile) : null

  if (!serverlessStateFile) {
    throw new Error(
      `Serverless Enterprise: Unable to save deployment due to missing "serverless-state.json"`
    )
  }

  // Create deployment record
  const deploymentData = {
    tenant: ctx.sls.service.tenant,
    app: ctx.sls.service.app,
    serviceName: ctx.sls.service.service,
    accessKey: accessKey,
    files: {
      'serverless-state.json': serverlessStateFile
    }
  }

  return createDeployment(deploymentData)
    .then((data) => {
      // Store state in plugin to be accessed by other hooks.
      // The deployment "update" will specifically look for this.
      ctx.state.deployment = {
        deploymentId: data.id,
        accessKey: user.accessKey,
        tenant: ctx.sls.service.tenant,
        app: ctx.sls.service.app,
        serviceName: ctx.sls.service.service
      }
    })
    .catch((error) => {
      ctx.sls.cli.log(`Error: ${error.message}`, `Serverless Enterprise`)
    })
}
