'use strict';

const chalk = require('chalk');
const { getLoggedInUser } = require('@serverless/platform-sdk');

const { getMetadata } = require('@serverless/platform-sdk');
const { configureDeployProfile } = require('../deployProfile');
const register = require('./register');
const setApp = require('./set-app');

module.exports = ctx => {
  const hooks = {
    'initialize': async () => {
      if (
        ctx.sls.config.servicePath &&
        ctx.sls.service.provider.name !== 'aws' &&
        (ctx.sls.processedInput.options.org || ctx.sls.processedInput.options.app)
      ) {
        throw new ctx.sls.classes.Error(
          `Sorry, the provider ${ctx.sls.service.provider.name} is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
        );
      }
      const { supportedRuntimes, supportedRegions } = await getMetadata();
      if (
        ctx.sls.config.servicePath &&
        !supportedRuntimes.includes(ctx.sls.service.provider.runtime || 'nodejs10.x') &&
        (ctx.sls.processedInput.options.org || ctx.sls.processedInput.options.app)
      ) {
        throw new ctx.sls.classes.Error(
          `Sorry, the runtime ${ctx.sls.service.provider.runtime} is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
        );
      }
      if (ctx.sls.config.servicePath && !supportedRegions.includes(ctx.provider.getRegion())) {
        throw new ctx.sls.classes.Error(
          `Sorry, the runtime ${ctx.sls.service.provider.runtime} is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
        );
      }
    },
    'before:interactiveCli:setupAws': async () => {
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
      if ((registerCheck || setAppCheck) && ctx.sls.service.app && ctx.sls.service.tenant) {
        process.stdout.write(`
${chalk.green('Your project is setup for monitoring, troubleshooting and testing')}
`);
        // setup deploy if user already logged in so that AWS creds check in SFO works right
        // & temporarily add provider to ctx to fetch deploy profile
        const user = getLoggedInUser();
        if (user) await configureDeployProfile({ ...ctx, provider: ctx.sls.getProvider('aws') });
      }
    },
    'interactiveCli:end': async () => {
      if (ctx.sls.service.app && ctx.sls.service.tenant) {
        process.stdout.write(`
${chalk.bold('Deploy your project and monitor, troubleshoot and test it:')}
- Run “serverless deploy” to deploy your service.
- Run “serverless dashboard” to view the dashboard.

`);
      }
    },
  };

  return hooks;
};
