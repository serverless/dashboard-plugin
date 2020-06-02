'use strict';

const chalk = require('chalk');
const { getLoggedInUser } = require('@serverless/platform-sdk');

const { getMetadata } = require('@serverless/platform-sdk');
const { configureDeployProfile } = require('../deployProfile');
const register = require('./register');
const setApp = require('./set-app');
const initToken = require('./initToken');
const spawn = require('child-process-ext/spawn');

module.exports = (ctx) => {
  const hooks = {
    'initialize': async () => {
      if (!ctx.sls.config.servicePath || !ctx.sls.interactiveCli) {
        return;
      }
      if (ctx.sls.processedInput.options.org || ctx.sls.processedInput.options.app) {
        const { supportedRuntimes, supportedRegions } = await getMetadata();
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
    'before:interactiveCli:initializeService': async () => {
      if (initToken.check(ctx.sls)) {
        await initToken.run(ctx.sls);
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
      if ((registerCheck || setAppCheck) && ctx.sls.service.app && ctx.sls.service.org) {
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
      const isTokenOnboard = !!ctx.sls.processedInput.options.token;
      if (isTokenOnboard) {
        spawn('npx', ['sls', 'studio'], {
          cwd: process.cwd(),
          env: {
            SERVERLESS_PLATFORM_STAGE: process.env.SERVERLESS_PLATFORM_STAGE,
            PATH: process.env.PATH,
          },
          stdio: 'inherit',
        });
      } else if (ctx.sls.service.app && ctx.sls.service.org) {
        process.stdout.write(`
${chalk.bold('Deploy your project and monitor, troubleshoot and test it:')}
- Run “serverless deploy” to deploy your service.
- Run “serverless dashboard” to view the dashboard.

`);
      }
      return Promise.resolve();
    },
  };

  return hooks;
};
