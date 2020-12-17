'use strict';

const { isEmpty, entries } = require('lodash');
const chalk = require('chalk');
const cliTable = require('cli-color/columns');
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
    const slsCli = context.sls.cli;
    if (!params[name]) slsCli.log(`No '${name}' parameter stored`);
    else process.stdout.write(`${params[name]}\n`);
  },
  list: async (context) => {
    const params = await resolveParams(resolveInput(context));
    const slsCli = context.sls.cli;
    if (isEmpty(params)) {
      slsCli.log('No parameters stored');
    } else {
      slsCli.log('Stored parameters:');
      process.stdout.write(
        `\n${cliTable([[chalk.bold('Name'), chalk.bold('Value')], ...entries(params)])}\n`
      );
    }
  },
};
