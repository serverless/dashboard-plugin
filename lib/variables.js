'use strict';

const _ = require('lodash');
const {
  getStateVariable,
  getAccessKeyForTenant,
  getDeployProfile,
} = require('@serverless/platform-sdk');

// functions for new way of getting variables
const getValueFromDashboardParams = ctx => async variableString => {
  const variableName = variableString.substring(variableString.indexOf(':') + 1);
  ctx.state.secretsUsed.add(variableName);
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout' ||
    ctx.sls.interactiveCli
  ) {
    return '';
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
  if (!secrets[variableName]) {
    throw new ctx.sls.classes.Error(`$\{${variableString}} not defined`);
  }
  return secrets[variableName];
};

const getValueFromDashboardOutputs = ctx => async variableString => {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant);
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout' ||
    ctx.sls.interactiveCli
  ) {
    return '';
  }
  const variableParts = variableString.split(':').slice(1);
  let service;
  let key;
  let app = ctx.sls.service.app;
  let stage = ctx.provider.getStage();
  let region = ctx.provider.getRegion();
  if (variableParts.length === 1) {
    service = variableParts[0].split('.', 1)[0];
    key = variableParts[0].substr(service.length);
  } else if (variableParts.length === 4) {
    service = variableParts[3].split('.', 1)[0];
    key = variableParts[3].substr(service.length);
    if (variableParts[0]) {
      app = variableParts[0];
    }
    if (variableParts[1]) {
      stage = variableParts[1];
    }
    if (variableParts[2]) {
      region = variableParts[2];
    }
  } else {
    throw new ctx.sls.classes.Error(
      '`${${variableString}}` does not conform to syntax ${outputs:service.key} or ${outputs:app:stage:region:service.key}'
    );
  }
  const outputName = key.split('.')[1];
  const subkey = key.substr(outputName.length + 2);
  const { value } = await getStateVariable({
    accessKey,
    outputName,
    service,
    app,
    tenant: ctx.sls.service.tenant,
    stage,
    region,
  });
  if (subkey) {
    return _.get(value, subkey);
  }
  return value;
};

module.exports = {
  getValueFromDashboardParams,
  getValueFromDashboardOutputs,
};
