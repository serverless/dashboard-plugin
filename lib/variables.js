'use strict';

const _ = require('lodash');
const {
  getStateVariable,
  getAccessKeyForTenant,
  getDeployProfile,
} = require('@serverless/platform-sdk');

// functions for new way of getting variables
const getValueFromDashboardSecrets = ctx => async variableString => {
  ctx.state.secretsUsed.add(variableString.substring(8));
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout'
  ) {
    return {};
  }
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant);
  const deploymentProfile = await getDeployProfile({
    accessKey,
    stage: ctx.provider.getStage(),
    ..._.pick(ctx.sls.service, ['tenant', 'app', 'service']),
  });
  const secrets = _.fromPairs(
    deploymentProfile.secretValues.map(({ secretName, secretProperties: { value } }) => [
      secretName,
      value,
    ])
  );
  if (!secrets[variableString.split('secrets:')[1]]) {
    throw new Error(`$\{${variableString}} not defined`);
  }
  return secrets[variableString.split('secrets:')[1]];
};

const getValueFromDashboardState = ctx => async variableString => {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant);
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout'
  ) {
    return {};
  }
  const service = variableString.substring(6).split('.', 1)[0];
  const key = variableString.substring(6).substr(service.length);
  const outputName = key.split('.')[1];
  const subkey = key.substr(outputName.length + 2);
  const { value } = await getStateVariable({
    accessKey,
    outputName,
    service,
    app: ctx.sls.service.app,
    tenant: ctx.sls.service.tenant,
    stage: ctx.provider.getStage(),
    region: ctx.provider.getRegion(),
  });
  if (subkey) {
    return _.get(value, subkey);
  }
  return value;
};

module.exports = {
  getValueFromDashboardSecrets,
  getValueFromDashboardState,
};
