import { removeLogDestination } from '@serverless/platform-sdk'

export default async (ctx) => {
  if (
    !ctx.sls.service.custom ||
    !ctx.sls.service.custom.platform ||
    !ctx.sls.service.custom.platform.collectLambdaLogs
  ) {
    return
  }
  const destinationOpts = {
    tenantName: ctx.sls.service.tenant,
    appName: ctx.sls.service.app,
    serviceName: ctx.sls.service.getServiceName(),
    stageName: ctx.sls.provider.getStage(),
    regionName: ctx.sls.provider.getRegion()
  }

  await removeLogDestination(destinationOpts)
  return
}
