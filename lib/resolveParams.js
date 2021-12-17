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
      for (const { paramName, paramValue, paramType } of parametersResponse.result) {
        params[paramName] = { value: paramValue, type: paramType.slice(0, -1) };
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
