'use strict';

const { isEmpty, isObject } = require('lodash');
const chalk = require('chalk');
const cliTable = require('cli-color/columns');
const { legacy, writeText } = require('@serverless/utils/log');
const log = require('./log');
const isAuthenticated = require('./isAuthenticated');
const throwAuthError = require('./throwAuthError');
const resolveOutputs = require('./resolveOutputs');
const resolveOutput = require('./resolveOutput');

const resolveInput = function (ctx) {
  const {
    provider,
    sls: {
      service: { app, org, service },
      processedInput: { options: cliOptions },
      classes: { Error: ServerlessError },
    },
  } = ctx;

  if (!isAuthenticated()) throwAuthError(ctx.sls);

  if (!org) throw new ServerlessError('Missing `org` setting', 'DASHBOARD_MISSING_ORG');
  if (!app) throw new ServerlessError('Missing `app` setting', 'DASHBOARD_MISSING_APP');

  const serviceName = cliOptions.service || service;
  if (!serviceName) {
    throw new ServerlessError('Missing `service` setting', 'DASHBOARD_MISSING_SERVICE');
  }

  const stage = cliOptions.stage || provider.getStage();
  const region = cliOptions.region || provider.getRegion();

  return { app, org, stage, region, service: serviceName };
};

const stringifyValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((valueItem) => {
        return isObject(valueItem) ? JSON.stringify(valueItem) : valueItem;
      })
      .join(', ');
  }
  if (isObject(value)) return JSON.stringify(value);
  return value;
};

module.exports = {
  get: async (context) => {
    const { name } = context.sls.processedInput.options;
    if (!name) {
      throw new context.sls.classes.Error(
        'Missing `name` parameter',
        'DASHBOARD_MISSING_OUTPUT_NAME'
      );
    }
    const value = await (async () => {
      try {
        return await resolveOutput(name, resolveInput(context));
      } catch (error) {
        if (error.message.includes(' not found')) return null;
        throw error;
      }
    })();
    if (!value) {
      legacy.log(`No '${name}' output stored`);
      log.notice.skip(`No "${name}" output stored`);
    } else {
      legacy.write(`${stringifyValue(value)}\n`);
      writeText(stringifyValue(value));
    }
  },
  list: async (context) => {
    const outputs = await resolveOutputs(resolveInput(context));
    if (isEmpty(outputs)) {
      legacy.log('No outputs stored');
      log.notice.skip('No outputs stored');
    } else {
      legacy.log('Stored outputs:');
      legacy.write(
        `\n${cliTable([
          [chalk.bold('Name'), chalk.bold('Value')],
          ...Object.entries(outputs).map(([name, value]) => [name, stringifyValue(value)]),
        ])}\n`
      );
      writeText(
        Object.entries(outputs).map(([name, value]) => `${name}: ${stringifyValue(value)}`)
      );
    }
  },
};
