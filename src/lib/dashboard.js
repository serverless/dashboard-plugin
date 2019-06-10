import { urls } from '@serverless/platform-sdk'

export const getDashboardUrl = (ctx) => {
  let dashboardUrl = urls.frontendUrl
  dashboardUrl += `tenants/${ctx.sls.service.tenant}/`
  dashboardUrl += `applications/${ctx.sls.service.app}/`
  dashboardUrl += `services/${ctx.sls.service.service}/`
  dashboardUrl += `stage/${ctx.provider.getStage()}/`
  dashboardUrl += `region/${ctx.provider.getRegion()}`
  return dashboardUrl
}
