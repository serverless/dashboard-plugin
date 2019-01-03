import { getApp } from '@serverless/platform-sdk'

export default async function(tenantName, appName) {
  const app = await getApp({
    tenant: tenantName,
    app: appName
  })

  return app.appUid
}
