'use strict';

const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const { ServerlessSDK } = require('@serverless/platform-client');

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
  const sdkV2 = new ServerlessSDK({
    accessKey,
  });
  const providerCredentials = await sdkV2.getProvidersByOrgServiceInstance(
    ctx.sls.service.orgUid,
    ctx.sls.service.service,
    `${ctx.sls.service.service}|${ctx.provider.getStage()}|${ctx.provider.getRegion()}`
  );
  if (providerCredentials.result) {
    const awsCredentials = providerCredentials.result.find(
      (result) => result.providerName === 'aws'
    );
    if (awsCredentials) {
      ctx.provider.cachedCredentials = {
        accessKeyId: awsCredentials.accessKey,
        secretAccessKey: awsCredentials.secretAccessKey,
      };
      ctx.provider.cachedCredentials.region = ctx.provider.getRegion();
    }
  }
  ctx.safeguards = deploymentProfile.safeguardsPolicies;
};
