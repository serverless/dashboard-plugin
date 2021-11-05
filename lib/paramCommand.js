'use strict';

const { isEmpty } = require('lodash');
const chalk = require('chalk');
const cliTable = require('cli-color/columns');
const { legacy, writeText } = require('@serverless/utils/log');
const log = require('./log');
const isAuthenticated = require('./isAuthenticated');
const throwAuthError = require('./throwAuthError');
const resolveParams = require('./resolveParams');

const resolveInput = function (ctx) {
  const {
    provider,
    sls: {
      service: { app, org },
      processedInput: { options: cliOptions },
      classes: { Error: ServerlessError },
    },
  } = ctx;

  if (!isAuthenticated()) throwAuthError(ctx.sls);

  if (!org) throw new ServerlessError('Missing `org` setting', 'DASHBOARD_MISSING_ORG');
  if (!app) throw new ServerlessError('Missing `app` setting', 'DASHBOARD_MISSING_APP');
  const stage = cliOptions.stage || provider.getStage();
  const region = cliOptions.region || provider.getRegion();
  const service = ctx.sls.service.service || cliOptions.service;
  return { org, app, service, stage, region };
};

module.exports = {
  get: async (context) => {
    const params = await resolveParams(resolveInput(context));
    const { name } = context.sls.processedInput.options;
    if (!name) {
      throw new context.sls.classes.Error(
        'Missing `name` parameter',
        'DASHBOARD_MISSING_PARAM_NAME'
      );
    }
    if (!params[name]) {
      legacy.log(`No '${name}' parameter stored`);
      log.notice.skip(`No "${name}"" parameter stored`);
    } else {
      legacy.write(`${params[name]}\n`);
      writeText(params[name]);
    }
  },
  list: async (context) => {
    const params = await resolveParams(resolveInput(context));
    if (isEmpty(params)) {
      legacy.log('No parameters stored');
      log.notice.skip('No parameters stored');
    } else {
      legacy.log('Stored parameters:');
      legacy.write(
        `\n${cliTable([[chalk.bold('Name'), chalk.bold('Value')], ...Object.entries(params)])}\n`
      );
      writeText(Object.entries(params).map(([name, value]) => `${name}: ${value}`));
    }
  },
};
