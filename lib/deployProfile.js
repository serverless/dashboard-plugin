'use strict';

const _ = require('lodash');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const { hookIntoVariableGetter } = require('./variables');

module.exports.configureDeployProfile = async (ctx, hook = false) => {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant);
  const deploymentProfile = await getDeployProfile({
    accessKey,
    stage: ctx.provider.getStage(),
    ..._.pick(ctx.sls.service, ['tenant', 'app', 'service']),
  });
  if (deploymentProfile.providerCredentials) {
    ctx.provider.cachedCredentials = deploymentProfile.providerCredentials.secretValue;
    ctx.provider.cachedCredentials.region = ctx.provider.getRegion();
  }
  ctx.safeguards = deploymentProfile.safeguardsPolicies;
  if (hook) {
    hookIntoVariableGetter(
      ctx,
      _.fromPairs(
        deploymentProfile.secretValues.map(({ secretName, secretProperties: { value } }) => [
          secretName,
          value,
        ])
      ),
      accessKey
    );
  }
};
