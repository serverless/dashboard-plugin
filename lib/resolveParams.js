'use strict';

const memoizee = require('memoizee');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');

module.exports = memoizee(
  async ({ org, app, stage }) => {
    const deploymentProfile = await getDeployProfile({
      accessKey: await getAccessKeyForTenant(org),
      stage,
      app,
      tenant: org,
    });
    const params = Object.create(null);
    for (const {
      secretName: name,
      secretProperties: { value },
    } of deploymentProfile.secretValues) {
      params[name] = value;
    }
    return params;
  },
  { promise: true, normalizer: ([{ org, app, stage }]) => JSON.stringify({ org, app, stage }) }
);
