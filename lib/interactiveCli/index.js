'use strict';

const chalk = require('chalk');
const configUtils = require('@serverless/utils/config');

const { ServerlessSDK } = require('@serverless/platform-client');
const { configureDeployProfile } = require('../deployProfile');
const register = require('./register');
const setApp = require('./set-app');

module.exports = (ctx) => {
  const hooks = {
    'initialize': async () => {
      if (!ctx.sls.config.servicePath || !ctx.sls.interactiveCli) {
        return;
      }
      if (ctx.sls.processedInput.options.org || ctx.sls.processedInput.options.app) {
        const sdk = new ServerlessSDK();
        const { supportedRuntimes, supportedRegions } = await sdk.metadata.get();
        if (ctx.sls.service.provider.name !== 'aws') {
          throw new ctx.sls.classes.Error(
            `Sorry, the provider ${ctx.sls.service.provider.name} is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
          );
        }
        if (!supportedRuntimes.includes(ctx.sls.service.provider.runtime || 'nodejs12.x')) {
          throw new ctx.sls.classes.Error(
            `Sorry, the runtime ${ctx.sls.service.provider.runtime} is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
          );
        }
        if (!supportedRegions.includes(ctx.provider.getRegion())) {
          throw new ctx.sls.classes.Error(
            `Sorry, the region ${ctx.provider.getRegion()} is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
          );
        }
      }
    },
    'before:interactiveCli:setupAws': async () => {
      const registerCheck = await register.check(ctx);
      if (registerCheck) {
        process.stdout.write('\n');
        await register.run(ctx, registerCheck);
      }
      const setAppCheck = await setApp.check(ctx.sls);
      if (setAppCheck) {
        process.stdout.write('\n');
        await setApp.run(ctx.sls, setAppCheck);
      }
      if ((registerCheck || setAppCheck) && ctx.sls.service.app && ctx.sls.service.org) {
        process.stdout.write(`
${chalk.green('Your project is setup for monitoring, troubleshooting and testing')}
`);
        // setup deploy if user already logged in so that AWS creds check in SFO works right
        // & temporarily add provider to ctx to fetch deploy profile
        const user = configUtils.getLoggedInUser();
        if (user) await configureDeployProfile({ ...ctx, provider: ctx.sls.getProvider('aws') });
      }
    },
    'interactiveCli:end': async () => {
      if (ctx.sls.service.app && ctx.sls.service.org) {
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
