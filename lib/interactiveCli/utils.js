'use strict';

const { createAccessKeyForTenant, writeConfigFile } = require('@serverless/platform-sdk');

module.exports = {
  resolveAccessKey: async (user, orgName) => {
    if (user.accessKeys && user.accessKeys[orgName]) return user.accessKeys[orgName];
    const token = await createAccessKeyForTenant(orgName);
    await writeConfigFile({
      users: { [user.userId]: { dashboard: { accessKeys: { [orgName]: token } } } },
    });
    return token;
  },
  sleep: (timeout) => new Promise((resolve) => setTimeout(resolve, timeout)),
};
