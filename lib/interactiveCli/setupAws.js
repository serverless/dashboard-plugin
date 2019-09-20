'use strict';

const chalk = require('chalk');
const { getLoggedInUser, getManagedAccounts } = require('@serverless/platform-sdk');
const { configureDeployProfile } = require('../deployProfile');
const { steps: registerSteps } = require('./register');
const { check: setAppCheck, steps: setAppSteps, run: setAppRun } = require('./set-app');

// TODO: Update with real implementations
/* eslint-disable no-unused-vars */
const resolveCaptchaToken = async () => {
  process.stdout.write('\nIn your browser please verify you are not a robot.\n');
};
const getAwsPreviewManagedAccount = async tenantName =>
  (await getManagedAccounts(tenantName)).find(
    managedAccount => managedAccount.name === 'awsPreview'
  ) || null;
const createAwsPreviewManagedAccount = async (tenantName, captchaToken) => ({});
const setDeploymentProfileAccessRole = async (serverless, managedAccount) => {};
/* eslint-enable */

const STATUS_EXPIRED = 'EXPIRED';

module.exports = ctx => {
  const { sls: serverless } = ctx;
  const { awsSetupConfiguration, inquirer } = serverless.interactiveCli;

  const registrationTypeChoice = () =>
    inquirer
      .prompt({
        message: 'How would you like to setup an AWS account?',
        type: 'list',
        name: 'awsSetupType',
        choices: [
          { name: 'Use free preview account', value: 'preview' },
          { name: 'Let me use my own AWS account', value: 'own' },
          { name: "Skip, I'll set up an AWS account later", value: 'skip' },
        ],
      })
      .then(({ awsSetupType }) => awsSetupType);

  const { steps } = awsSetupConfiguration;

  const originalShouldSetupAwsCredentials = steps.shouldSetupAwsCredentials;
  steps.shouldSetupAwsCredentials = async () => {
    const user = getLoggedInUser();
    let tenantName = serverless.service.tenant;
    if (tenantName && user) {
      const awsPreviewManagedAccount = await getAwsPreviewManagedAccount(tenantName);
      if (awsPreviewManagedAccount && awsPreviewManagedAccount.status === STATUS_EXPIRED) {
        return originalShouldSetupAwsCredentials(serverless);
      }
    }

    const registrationType = await registrationTypeChoice();
    switch (registrationType) {
      case 'preview': {
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
          setAppSteps.enableConfirm = async () => true; // Mute unwanted prompt
          await setAppRun(serverless, setAppOptions);
        }
        tenantName = serverless.service.tenant;
        let awsPreviewManagedAccount = await getAwsPreviewManagedAccount(tenantName);

        if (!awsPreviewManagedAccount) {
          const captchaToken = await resolveCaptchaToken();
          awsPreviewManagedAccount = await createAwsPreviewManagedAccount(
            serverless.service.tenant,
            captchaToken
          );
        } else if (awsPreviewManagedAccount.status === STATUS_EXPIRED) {
          process.stdout.write(
            '\nFree preview account has already expired. Use own AWS account instead.\n\n'
          );
          return true;
        }
        await setDeploymentProfileAccessRole(serverless, awsPreviewManagedAccount);
        await configureDeployProfile(ctx);
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
