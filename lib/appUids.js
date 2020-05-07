'use strict';

const { getApp } = require('@serverless/platform-sdk');

module.exports = async function (orgName, appName) {
  const app = await getApp({
    tenant: orgName,
    app: appName,
  });

  return {
    appUid: app.appUid,
    orgUid: app.tenantUid,
  };
};
