'use strict';

const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const { ServerlessSDK } = require('@serverless/platform-client');
const { serviceSlug, instanceSlug } = require('./utils');

module.exports.configureDeployProfile = async (ctx) => {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.org);
  let deploymentProfile;
  const {
    provider,
    sls: {
      service: { app, org, service },
      processedInput: { options: cliOptions },
    },
  } = ctx;

  const stage = cliOptions.stage || provider.getStage();
  const region = cliOptions.region || provider.getRegion();
  const parameterizedArgs = [];
  for (const argument of [
    { name: 'app', value: app },
    { name: 'org', value: org },
    { name: 'service', value: service },
    { name: 'stage', value: stage },
    { name: 'region', value: region },
  ]) {
    if (argument.value.match(ctx.sls.service.provider.variableSyntax)) {
      parameterizedArgs.push(argument);
    }
  }
  if (parameterizedArgs.length) {
    const names = parameterizedArgs.map((arg) => arg.name).join(', ');
    ctx.sls._logDeprecation(
      'PARAMETERIZED_ARGUMENT',
      `Cannot parameterize "${names}" please use plaintext or pass arguments via command line options.\nReceived-\n${parameterizedArgs
        .map((arg) => `${arg.name}: ${arg.value}`)
        .join('\n')}`
    );
  }
  try {
    deploymentProfile = await getDeployProfile({
      accessKey,
      stage,
      app,
      tenant: org,
    });
  } catch (e) {
    if (process.env.SLS_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('ignoring profile fetch error', e);
    }
  }
  if (deploymentProfile && deploymentProfile.providerCredentials) {
    ctx.provider.cachedCredentials = deploymentProfile.providerCredentials.secretValue;
    ctx.provider.cachedCredentials.region = region;
  }
  if (!parameterizedArgs.length) {
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
        serviceSlug({ app, service }),
        instanceSlug({ app, service, stage, region })
      );
    } catch (e) {
      if (!e.statusCode === '404') {
        throw e;
      }
      // The platform-client sdk will throw an error for a 404
      // Log it if we're in debug mode
      if (process.env.SLS_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('ignoring provider credentials error');
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
  }
};
