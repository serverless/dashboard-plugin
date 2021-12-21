'use strict';

const { isEmpty } = require('lodash');
const chalk = require('chalk');
const cliTable = require('cli-color/columns');
const { legacy, writeText, style } = require('@serverless/utils/log');
const log = require('./log');
const resolveParams = require('./resolveParams');

module.exports = {
  get: async (context) => {
    const cliOptions = context.sls.processedInput.options;
    if (!context.sls.service.service && !cliOptions.service) {
      throw new context.sls.classes.Error(
        'command needs to be run in service context or "service" param needs to be provided',
        'PARAMS_MISSING_SERVICE_NAME'
      );
    }
    const { name } = cliOptions;
    if (!name) {
      throw new context.sls.classes.Error(
        'Missing `name` parameter',
        'DASHBOARD_MISSING_PARAM_NAME'
      );
    }
    const params = await resolveParams(context);
    if (!params[name]) {
      legacy.log(`No '${name}' parameter stored`);
      log.notice.skip(`No "${name}"" parameter stored`);
    } else {
      legacy.write(`${params[name].value}\n`);
      writeText(params[name].value);
      if (params[name].isOverriden) {
        log.notice(
          style.aside('This Serverless Console parameter is overridden in service configuration')
        );
      }
    }
  },
  list: async (context) => {
    const cliOptions = context.sls.processedInput.options;
    if (!context.sls.service.service && !cliOptions.service) {
      throw new context.sls.classes.Error(
        'command needs to be run in service context or "service" param needs to be provided',
        'PARAMS_MISSING_SERVICE_NAME'
      );
    }
    const params = await resolveParams(context);
    if (isEmpty(params)) {
      legacy.log('No parameters stored');
      log.notice.skip('No parameters stored');
    } else {
      legacy.log('Stored parameters:');
      legacy.write(
        `\n${cliTable([
          [chalk.bold('Name'), chalk.bold('Value')],
          ...Object.entries(params).map(([key, { value }]) => [key, value]),
        ])}\n`
      );
      for (const [name, { value, isOverriden }] of Object.entries(params)) {
        writeText(`${name}: ${value}`);
        if (isOverriden) {
          log.notice(
            style.aside(
              '   This Serverless Console parameter is overridden in service configuration'
            )
          );
        }
      }
    }
  },
};
