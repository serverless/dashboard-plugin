/*
 * Archive Service
 */

import { archiveService, getAccessKeyForTenant } from '@serverless/platform-sdk'

export default async function(ctx) {
  // Defaults
  const accessKey = getAccessKeyForTenant(ctx.state.tenant)

  ctx.sls.cli.log('Archving this service in the Enterprise Dashboard...', 'Serverless Enterprise')

  const data = {
    name: ctx.state.service,
    tenant: ctx.state.tenant,
    app: ctx.state.app,
    provider: ctx.sls.service.provider.name,
    region: ctx.sls.service.provider.region,
    accessKey
  }

  return archiveService(data)
    .then(() => {
      ctx.sls.cli.log(
        'Successfully archived this service in the Enterprise Dashboard...',
        'Serverless Enterprise'
      )
    })
    .catch((err) => {
      ctx.sls.cli.log(
        'Failed to archive this service in the Enterprise Dashboard...',
        'Serverless Enterprise'
      )
      throw new Error(err)
    })
}
