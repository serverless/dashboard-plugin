'use strict';

const chalk = require('chalk');
const { getLoggedInUser } = require('@serverless/platform-sdk');
const { steps: registerSteps } = require('./register');
const { check: setAppCheck, steps: setAppSteps } = require('./set-app');

// TODO: Update with real implementations
const resolveCaptchaToken = async () => {
  process.stdout.write('\nIn your browser please verify you are not a robot.\n');
};
const getTenant = async tenantName => ({}); // eslint-disable-line no-unused-vars
const createManagedAccount = async (tenantName, captchaToken) => {}; // eslint-disable-line no-unused-vars

module.exports = serverless => {
  const { awsSetupConfiguration, inquirer } = serverless.interactiveCli;

  const registrationTypeChoice = () =>
    inquirer
      .prompt({
        message: 'How would you like to setup an AWS account?',
        type: 'list',
        name: 'registrationType',
        choices: [
          { name: 'Use free preview account', value: 'preview' },
          { name: 'Let me use my own AWS account', value: 'own' },
          { name: "Skip, I'll set up an AWS account later", value: 'skip' },
        ],
      })
      .then(({ registrationType }) => registrationType);

  const { steps, check } = awsSetupConfiguration;
  awsSetupConfiguration.check = async () => {
    if (!(await check(serverless))) return false;
    const tenantName = serverless.service.tenant;
    if (tenantName) {
      const user = getLoggedInUser();
      if (user) {
        const tenantNames = await setAppSteps.resolveTenantNames(user);
        if (tenantNames.has(tenantName)) {
          const tenant = await getTenant(tenantName);
          if (tenant && tenant.managedAccount) return false;
        }
      }
    }
    return true;
  };

  steps.shouldSetupAwsCredentials = async () => {
    const registrationType = await registrationTypeChoice();
    switch (registrationType) {
      case 'preview': {
        const user = getLoggedInUser();
        if (!user) {
          process.stdout.write(
            '\nTo enable a free preview account, you must have a Serverless account.\n\n'
          );
          await registerSteps.registerOrLogin(serverless);
        }
        const setAppOptions = await setAppCheck(serverless);
        if (setAppOptions) {
          process.stdout.write(
            '\nTo enable a free preview account, ' +
              'a Serverless Dashboard access needs to be configured for the service.\n\n'
          );
          await setAppSteps.setTenantAndApp(serverless, setAppOptions);
        }
        const captchaToken = await resolveCaptchaToken();
        await createManagedAccount(serverless.service.tenant, captchaToken);
        process.stdout.write(`\n${chalk.green('Successfully created a free AWS Account.')}\n`);
        return false;
      }
      case 'own':
        return true;
      case 'skip':
        steps.writeOnSetupSkip();
        return false;
      default:
        throw new Error('Unexpected registration type');
    }
  };
};
