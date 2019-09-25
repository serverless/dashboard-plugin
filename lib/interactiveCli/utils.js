'use strict';

const { createAccessKeyForTenant, writeConfigFile } = require('@serverless/platform-sdk');

module.exports = {
  resolveAccessKey: async (user, tenantName) => {
    if (user.accessKeys && user.accessKeys[tenantName]) return user.accessKeys[tenantName];
    const token = await createAccessKeyForTenant(tenantName);
    await writeConfigFile({
      users: { [user.userId]: { dashboard: { accessKeys: { [tenantName]: token } } } },
    });
    return token;
  },
};
