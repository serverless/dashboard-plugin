'use strict';

const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');

module.exports.configureDeployProfile = async (ctx) => {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.org);
  const deploymentProfile = await getDeployProfile({
    accessKey,
    stage: ctx.provider.getStage(),
    app: ctx.sls.service.app,
    tenant: ctx.sls.service.org,
  });
  if (deploymentProfile.providerCredentials) {
    ctx.provider.cachedCredentials = deploymentProfile.providerCredentials.secretValue;
    ctx.provider.cachedCredentials.region = ctx.provider.getRegion();
  }
  ctx.safeguards = deploymentProfile.safeguardsPolicies;
};
