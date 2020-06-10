'use strict';
const writeAttrs = require('../writeAttrs');
const chalk = require('chalk');

module.exports = async (serverless, tenantName, newServiceName, servicePath) => {
  serverless.config.servicePath = servicePath;
  serverless.service.org = tenantName;
  serverless.service.app = newServiceName;
  await writeAttrs(serverless, tenantName, newServiceName);
  process.stdout.write(
    `\n${chalk.green(
      `cd to '${servicePath}' and run 'serverless dev' to get started developing!`
    )}\n`
  );
};
