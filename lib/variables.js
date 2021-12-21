'use strict';

const _ = require('lodash');
const resolveOutput = require('./resolveOutput');
const resolveParams = require('./resolveParams');
const throwAuthError = require('./throwAuthError');
const isAuthenticated = require('./isAuthenticated');

const resolveInput = function (ctx) {
  const {
    provider,
    sls: {
      service: { app, org, service },
      processedInput: { options: cliOptions },
    },
  } = ctx;

  if (!isAuthenticated()) throwAuthError(ctx.sls);

  const stage = cliOptions.stage || provider.getStage();
  const region = cliOptions.region || provider.getRegion();
  return { org, app, service, stage, region };
};

// functions for new way of getting variables
const getValueFromDashboardParams = (ctx) => async (paramName) => {
  ctx.state.secretsUsed.add(paramName);
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout'
  ) {
    return '';
  }

  const stage = ctx.provider.getStage();
  const paramsConfig = new Map(Object.entries(ctx.sls.configurationInput.params || {}));

  // 1. Local, stage specific params
  const paramsStageConfig = new Map(Object.entries(paramsConfig.get(stage) || {}));

  if (paramsStageConfig.get(paramName) != null) return paramsStageConfig.get(paramName);

  // 2. Console, instance specific params
  const dashboardParams =
    (ctx.sls.enterpriseEnabled && (await resolveParams(resolveInput(ctx)))) || {};
  const dashboardInstanceParams = new Map(
    Object.entries(dashboardParams)
      .filter(([, { type }]) => type === 'instance')
      .map(([key, { value }]) => [key, value])
  );
  if (dashboardInstanceParams.has(paramName)) return dashboardInstanceParams.get(paramName);

  // 3. Local, default params
  const paramsDefaultConfig = new Map(Object.entries(paramsConfig.get('default') || {}));

  if (paramsDefaultConfig.get(paramName) != null) return paramsDefaultConfig.get(paramName);

  // 4. Console, service specific params
  const dashboardServiceParams = new Map(
    Object.entries(dashboardParams)
      .filter(([, { type }]) => type === 'service')
      .map(([key, { value }]) => [key, value])
  );

  if (dashboardServiceParams.has(paramName)) return dashboardServiceParams.get(paramName);

  return null;
};

const getValueFromDashboardOutputs = (ctx) => async (outputAddress) => {
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout'
  ) {
    return '';
  }
  const variableParts = outputAddress.split(':');
  let service;
  let key;
  let app = ctx.sls.service.app;
  let stage = ctx.provider.getStage();
  let region = ctx.provider.getRegion();
  if (variableParts.length === 1) {
    service = variableParts[0].split('.', 1)[0];
    key = variableParts[0].slice(service.length);
  } else if (variableParts.length === 4) {
    service = variableParts[3].split('.', 1)[0];
    key = variableParts[3].slice(service.length);
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
  const subkey = key.slice(outputName.length + 2);
  if (!ctx.sls.enterpriseEnabled) throwAuthError(ctx.sls);
  const value = await (async () => {
    try {
      return await resolveOutput(outputName, {
        service,
        app,
        org: ctx.sls.service.org,
        stage,
        region,
      });
    } catch (error) {
      if (error.message.includes(' not found')) return null;
      throw error;
    }
  })();
  if (subkey) {
    return _.get(value, subkey);
  }
  return value;
};

module.exports = {
  async paramResolve({ address }) {
    return {
      value: await getValueFromDashboardParams(this)(address),
    };
  },
  async outputResolve({ address }) {
    return {
      value: await getValueFromDashboardOutputs(this)(address),
    };
  },
};
