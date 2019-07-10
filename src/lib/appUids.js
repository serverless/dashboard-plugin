const { getApp } = require('@serverless/platform-sdk')

module.exports = async function(tenantName, appName) {
  const app = await getApp({
    tenant: tenantName,
    app: appName
  })

  return {
    appUid: app.appUid,
    tenantUid: app.tenantUid
  }
}
