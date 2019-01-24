import { getCredentials, getAccessKeyForTenant } from '@serverless/platform-sdk'

export default async function(ctx) {
  if (!process.env.SLS_CLOUD_ACCESS) {
    return Promise.resolve()
  }

  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant)

  const { accessKeyId, secretAccessKey, sessionToken } = await getCredentials({
    accessKey,
    stageName: ctx.provider.getStage(),
    command: ctx.sls.processedInput.commands[0],
    app: ctx.sls.service.app,
    tenant: ctx.sls.service.tenant,
    service: ctx.sls.service.getServiceName()
  })
  process.env.AWS_ACCESS_KEY_ID = accessKeyId
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey
  process.env.AWS_SESSION_TOKEN = sessionToken
  ctx.sls.cli.log('Cloud credentials set from Serverless Platform.')
}
