'use strict';

const { getPlatformClientWithCredentials } = require('./clientUtils');

module.exports = async function (orgName, appName) {
  const sdk = await getPlatformClientWithCredentials(orgName);
  const app = await sdk.apps.get({ orgName, appName });

  return {
    appUid: app.appUid,
    orgUid: app.tenantUid,
  };
};
