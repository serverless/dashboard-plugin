'use strict';

const { getPlatformClientWithAccessKey } = require('./clientUtils');

module.exports = async function (orgName, appName) {
  const sdk = await getPlatformClientWithAccessKey(orgName);
  const app = await sdk.apps.get({ orgName, appName });

  return {
    appUid: app.appUid,
    orgUid: app.tenantUid,
  };
};
