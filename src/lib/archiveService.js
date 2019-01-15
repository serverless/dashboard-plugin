/*
* Archive Service
*/

import {
  archiveService,
  getLoggedInUser,
  getAccessKeyForTenant,
  getServiceUrl,
} from '@serverless/platform-sdk'
const fs = require('fs')
const os = require('os')
const path = require('path')

export default async function (ctx) {

  // Defaults
  const user = getLoggedInUser()
  const accessKey = getAccessKeyForTenant(ctx.state.tenant)
  let cfResources

  ctx.sls.cli.log(
    'Archving this service in the Enterprise Dashboard...',
    'Serverless Enterprise'
  )

  const data = {
    name: ctx.state.service,
    tenant: ctx.state.tenant,
    app: ctx.state.app,
    provider: ctx.sls.service.provider.name,
    region: ctx.sls.service.provider.region,
    accessKey,
  }

  return archiveService(data)
  .then(() => {
    ctx.sls.cli.log(
      'Successfully archived this service in the Enterprise Dashboard...',
      'Serverless Enterprise'
    )
  })
  .catch(err => {
    ctx.sls.cli.log(
      'Failed to archive this service in the Enterprise Dashboard...',
      'Serverless Enterprise'
    )
    throw new Error(err)
  })
}
