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
  let providerCredentials = {};
  try {
    if (!ctx.sls.service.orgUid) {
      const { orgUid } = await sdkV2.getOrgByName(ctx.sls.service.org);
      ctx.sls.service.orgUid = orgUid;
    }
    providerCredentials = await sdkV2.getProvidersByOrgServiceInstance(
      ctx.sls.service.orgUid,
      `appName|${ctx.sls.service.app}|serviceName|${ctx.sls.service.service}`,
      `app|${ctx.sls.service.app}|service|${
        ctx.sls.service.service
      }|stage|${ctx.provider.getStage()}|region|${ctx.provider.getRegion()}`
    );
  } catch (e) {
    // The platform-client sdk will throw an error for a 404
    // Log it if we're in debug mode
    if (process.env.SLS_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('ignoring provider credentials error', e);
    }
  }

  if (providerCredentials.result) {
    const awsCredentials = providerCredentials.result.find(
      (result) => result.providerName === 'aws'
    );
    if (awsCredentials) {
      ctx.provider.cachedCredentials = {
        accessKeyId: awsCredentials.providerDetails.accessKeyId,
        secretAccessKey: awsCredentials.providerDetails.secretAccessKey,
        sessionToken: awsCredentials.providerDetails.sessionToken,
      };
      ctx.provider.cachedCredentials.region = ctx.provider.getRegion();
    }
  }
  ctx.safeguards = deploymentProfile.safeguardsPolicies;
};
