'use strict';

const { legacy, style } = require('@serverless/utils/log');
const log = require('./log');
const { serviceSlug, instanceSlug } = require('./utils');
const { getDashboardUrl } = require('./dashboard');
const { getPlatformClientWithAccessKey } = require('./clientUtils');

module.exports.configureDeployProfile = async (ctx) => {
  let deploymentProfile;
  const {
    provider,
    sls: {
      service: { app, org, service },
      processedInput: { options: cliOptions },
    },
  } = ctx;

  if (cliOptions['use-local-credentials']) {
    if (process.env.SLS_DEBUG) {
      legacy.log('Skipping provider resolution, use-local-credentials option present');
    }
    log.info('Skipping provider resolution, use-local-credentials option present');
    return;
  }
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
    if (argument.value.includes('${')) {
      parameterizedArgs.push(argument);
    }
  }
  if (parameterizedArgs.length) {
    // TODO: Remove once Framework is at v3
    const names = parameterizedArgs.map((arg) => arg.name).join(', ');
    ctx.sls._logDeprecation(
      'PARAMETERIZED_ARGUMENT',
      `Cannot parameterize "${names}" please use plaintext or pass arguments via command line options.\nReceived-\n${parameterizedArgs
        .map((arg) => `${arg.name}: ${arg.value}`)
        .join('\n')}`
    );
  }

  const sdk = await getPlatformClientWithAccessKey(org);

  try {
    deploymentProfile = await sdk.deploymentProfiles.get({
      orgName: org,
      appName: app,
      stageName: stage,
    });
  } catch (e) {
    if (process.env.SLS_DEBUG) {
      legacy.log('ignoring profile fetch error', e);
    }
    log.debug('deployment profile fetch error %o', e);
  }
  if (deploymentProfile && deploymentProfile.providerCredentials) {
    ctx.provider.cachedCredentials = deploymentProfile.providerCredentials.secretValue;
    ctx.provider.cachedCredentials.region = region;
  }
  if (!parameterizedArgs.length) {
    let providerCredentials = {};
    try {
      if (!ctx.sls.service.orgUid) {
        const { orgUid } = await sdk.getOrgByName(ctx.sls.service.org);
        ctx.sls.service.orgUid = orgUid;
      }
      providerCredentials = await sdk.getProvidersByOrgServiceInstance(
        ctx.sls.service.orgUid,
        serviceSlug({ app, service }),
        instanceSlug({ app, service, stage, region })
      );
    } catch (e) {
      if (!e.statusCode === '404') {
        throw e;
      }
    }
    const providersConfigUrl = `${getDashboardUrl(ctx)}/providers`;

    if (providerCredentials.result) {
      const awsCredentials = providerCredentials.result.find(
        (result) => result.providerName === 'aws'
      );
      if (awsCredentials) {
        legacy.log(`Using provider credentials, configured via dashboard: ${providersConfigUrl}`);
        ctx.state.areProvidersUsed = true;
        ctx.provider.cachedCredentials = {
          dashboardProviderAlias: awsCredentials.alias,
          accessKeyId: awsCredentials.providerDetails.accessKeyId,
          secretAccessKey: awsCredentials.providerDetails.secretAccessKey,
          sessionToken: awsCredentials.providerDetails.sessionToken,
        };
        ctx.provider.cachedCredentials.region = ctx.provider.getRegion();
      }
    } else {
      legacy.log(
        `Using local credentials. Add provider credentials via dashboard: ${providersConfigUrl}`
      );
      log.notice(
        `Using local credentials. Add provider credentials via dashboard: ${style.link(
          providersConfigUrl
        )}`
      );
    }
  }
};
