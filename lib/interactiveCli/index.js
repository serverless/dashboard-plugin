'use strict';

const chalk = require('chalk');
const register = require('./register');
const setApp = require('./set-app');

module.exports = serverless => {
  if (!serverless.interactiveCli) return null;
  return {
    'after:interactiveCli:setupAws': async () => {
      const registerCheck = await register.check(serverless);
      if (registerCheck) {
        process.stdout.write('\n');
        await register.run(serverless, registerCheck);
      }
      const setAppCheck = await setApp.check(serverless);
      if (setAppCheck) {
        process.stdout.write('\n');
        await setApp.run(serverless, setAppCheck);
      }
      if (serverless.service.app && serverless.service.tenant) {
        process.stdout.write(`
${chalk.green('Your project is setup for monitoring, troubleshooting and testing')}

${chalk.bold('Deploy your project and monitor, troubleshoot and test it:')}
- Run “serverless deploy” to deploy your service.
- Run “serverless dashboard” to view the dashboard.

`);
      }
    },
  };
};
