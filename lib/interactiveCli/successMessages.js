'use strict';

const chalk = require('chalk');

module.exports.check = serverless => serverless.service.app && serverless.service.tenant;

module.exports.run = () =>
  process.stdout.write(`
${chalk.green('Your project is now setup for monitoring, troubleshooting and testing')}

${chalk.bold('Deploy your new project and monitor, troubleshoot and test it:')}
- Run “serverless deploy” to deploy your service.
- Run “serverless dashboard” to view the dashboard.

`);
