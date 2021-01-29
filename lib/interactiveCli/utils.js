'use strict';

const { createAccessKeyForTenant } = require('@serverless/platform-sdk');
const configUtils = require('@serverless/utils/config');

module.exports = {
  resolveAccessKey: async (user, orgName) => {
    if (user.accessKeys && user.accessKeys[orgName]) return user.accessKeys[orgName];
    const token = await createAccessKeyForTenant(orgName);
    configUtils.set({
      users: { [user.userId]: { dashboard: { accessKeys: { [orgName]: token } } } },
    });
    return token;
  },
  sleep: (timeout) => new Promise((resolve) => setTimeout(resolve, timeout)),
};
