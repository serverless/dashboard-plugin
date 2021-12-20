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
const getValueFromDashboardParams = (ctx) => async (variableString) => {
  const variableName = variableString.slice(variableString.indexOf(':') + 1);
  ctx.state.secretsUsed.add(variableName);
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout'
  ) {
    return '';
  }

  if (!ctx.sls.enterpriseEnabled) throwAuthError(ctx.sls);
  const secrets = await resolveParams(resolveInput(ctx));
  if (!secrets[variableName]) {
    throw new ctx.sls.classes.Error(`$\{${variableString}} not defined`, 'PARAM_NOT_FOUND');
  }
  return secrets[variableName];
};

const getValueFromDashboardOutputs = (ctx) => async (variableString) => {
  if (
    ctx.sls.processedInput.commands[0] === 'login' ||
    ctx.sls.processedInput.commands[0] === 'logout'
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
  const value = await resolveOutput(outputName, {
    service,
    app,
    org: ctx.sls.service.org,
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
  async paramResolve({ address }) {
    return {
      value: await (async () => {
        try {
          return await getValueFromDashboardParams(this)(`param:${address}`);
        } catch (error) {
          if (error.code === 'PARAM_NOT_FOUND') return null;
          throw error;
        }
      })(),
    };
  },
  async outputResolve({ address }) {
    return {
      value: await (async () => {
        try {
          return await getValueFromDashboardOutputs(this)(`output:${address}`);
        } catch (error) {
          if (error.message.includes(' not found')) return null;
          throw error;
        }
      })(),
    };
  },
};
