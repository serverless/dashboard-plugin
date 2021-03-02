'use strict';

const memoizee = require('memoizee');
const { serviceSlug, instanceSlug } = require('./utils');
const { getPlatformClientWithAccessKey } = require('./clientUtils');

module.exports = memoizee(
  async ({ org, app, service, stage, region }) => {
    const sdk = await getPlatformClientWithAccessKey(org);

    const { orgUid } = await sdk.getOrgByName(org);
    const parametersResponse = await sdk.getParamsByOrgServiceInstance(
      orgUid,
      serviceSlug({ app, service }),
      instanceSlug({ app, service, stage, region })
    );
    const params = Object.create(null);
    if (parametersResponse.result && parametersResponse.result.length) {
      for (const { paramName, paramValue } of parametersResponse.result) {
        params[paramName] = paramValue;
      }
    } else {
      const deploymentProfile = await sdk.deploymentProfiles.get({
        orgName: org,
        appName: app,
        stageName: stage,
      });
      for (const {
        secretName: name,
        secretProperties: { value },
      } of deploymentProfile.secretValues) {
        params[name] = value;
      }
    }

    return params;
  },
  {
    promise: true,
    normalizer: ([{ org, app, service, stage, region }]) =>
      JSON.stringify({ org, app, service, stage, region }),
  }
);
