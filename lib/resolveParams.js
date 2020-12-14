'use strict';

const memoizee = require('memoizee');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const { ServerlessSDK } = require('@serverless/platform-client');
const { serviceSlug, instanceSlug } = require('./utils');

module.exports = memoizee(
  async ({ org, app, service, stage, region }) => {
    const accessKey = await getAccessKeyForTenant(org);

    const sdkV2 = new ServerlessSDK({
      accessKey,
    });
    const { orgUid } = await sdkV2.getOrgByName(org);
    const parametersResponse = await sdkV2.getParamsByOrgServiceInstance(
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
      const deploymentProfile = await getDeployProfile({
        accessKey,
        stage,
        app,
        tenant: org,
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
