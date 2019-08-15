'use strict';

const chalk = require('chalk');
const { getLoggedInUser } = require('@serverless/platform-sdk');

const { configureDeployProfile } = require('../deployProfile');
const register = require('./register');
const setApp = require('./set-app');

module.exports = ctx => {
  if (!ctx.sls.interactiveCli) return null;
  const user = getLoggedInUser();

  const registerAndSetApp = async () => {
    const registerCheck = await register.check(ctx.sls);
    if (registerCheck) {
      process.stdout.write('\n');
      await register.run(ctx.sls, registerCheck);
    }
    const setAppCheck = await setApp.check(ctx.sls);
    if (setAppCheck) {
      process.stdout.write('\n');
      await setApp.run(ctx.sls, setAppCheck);
    }
    if (ctx.sls.service.app && ctx.sls.service.tenant) {
      process.stdout.write(`
${chalk.green('Your project is setup for monitoring, troubleshooting and testing')}
`);
      // setup deploy if user already logged in so that AWS creds check in SFO works right
      // & temporarily add provider to ctx to fetch deploy profile
      if (user) await configureDeployProfile({ ...ctx, provider: ctx.sls.getProvider('aws') });
    }
  };
  const showDoneMsg = async () => {
    if (ctx.sls.service.app && ctx.sls.service.tenant) {
      process.stdout.write(`

${chalk.bold('Deploy your project and monitor, troubleshoot and test it:')}
- Run “serverless deploy” to deploy your service.
- Run “serverless dashboard” to view the dashboard.

`);
    }
  };

  // if the user is logged in, go through Dashboard setup before AWS setup
  const hook = `${user ? 'before' : 'after'}:interactiveCli:setupAws`;

  const hooks = {
    [hook]: registerAndSetApp,
    'interactiveCli:end': showDoneMsg
  };

  return hooks;
};
