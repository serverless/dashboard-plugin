'use strict';

const memoizee = require('memoizee');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const { ServerlessSDK } = require('@serverless/platform-client');
const { serviceSlug, instanceSlug } = require('./utils');

module.exports = memoizee(
  async (ctx) => {
    const {
      sls: {
        provider,
        service: { org, app },
        processedInput: { options: cliOptions },
      },
    } = ctx;
    const stage = (cliOptions && cliOptions.stage) || provider.getStage();
    const accessKey = await getAccessKeyForTenant(org);

    const sdkV2 = new ServerlessSDK({
      accessKey,
    });
    if (!ctx.sls.service.orgUid) {
      const { orgUid } = await sdkV2.getOrgByName(org);
      ctx.sls.service.orgUid = orgUid;
    }
    const parametersResponse = await sdkV2.getParamsByOrgServiceInstance(
      ctx.sls.service.orgUid,
      serviceSlug(ctx),
      instanceSlug(ctx)
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
  { promise: true, normalizer: ([{ org, app, stage }]) => JSON.stringify({ org, app, stage }) }
);
