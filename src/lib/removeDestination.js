import { removeLogDestination } from '@serverless/platform-sdk'

export default async (ctx) => {
  if (
    !ctx.sls.service.custom ||
    !ctx.sls.service.custom.enterprise ||
    !ctx.sls.service.custom.enterprise.collectLambdaLogs
  ) {
    return
  }
  const destinationOpts = {
    appUid: ctx.sls.service.appUid,
    tenantUid: ctx.sls.service.tenantUid,
    serviceName: ctx.sls.service.getServiceName(),
    stageName: ctx.provider.getStage(),
    regionName: ctx.provider.getRegion()
  }

  await removeLogDestination(destinationOpts)
  return
}
