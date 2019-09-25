'use strict';

const chalk = require('chalk');
const {
  createManagedAccount,
  getDeployProfile,
  getLoggedInUser,
  getManagedAccounts,
  updateDeploymentProfile,
} = require('@serverless/platform-sdk');
const { configureDeployProfile } = require('../deployProfile');
const { steps: registerSteps } = require('./register');
const { check: setAppCheck, steps: setAppSteps, run: setAppRun } = require('./set-app');
const { resolveAccessKey, sleep } = require('./utils');

const STATUS_EXPIRED = 'EXPIRED';
const STATUS_IN_PROGRESS = 'IN_PROGRESS';
const validManagedAccountStatuses = new Set(['SUCCEEDED', STATUS_IN_PROGRESS, STATUS_EXPIRED]);

// TODO: Update with real implementations
/* eslint-disable no-unused-vars */
const resolveCaptchaToken = async () => {
  // process.stdout.write('\nIn your browser please verify you are not a robot.\n');
};
const getAwsPreviewManagedAccount = async ({ accessKey, tenantName }) =>
  (await getManagedAccounts({ accessKey, tenant: tenantName })).find(managedAccount =>
    validManagedAccountStatuses.has(managedAccount.status)
  ) || null;
const createAwsPreviewManagedAccount = async (accessKey, tenantName) =>
  createManagedAccount({ accessKey, tenant: tenantName });
const setDeploymentProfileAccessRole = async (ctx, accessKey, managedAccount) => {
  const { deploymentProfileUid } = await getDeployProfile({
    accessKey,
    stage: ctx.provider.getStage(),
    tenant: ctx.sls.service.tenant,
    app: ctx.sls.service.app,
    service: ctx.sls.service.service,
  });
  return updateDeploymentProfile({
    accessKey,
    deploymentProfileUid,
    tenant: ctx.sls.service.tenant,
    providerCredentials: {
      type: 'awsIam',
      roleArn: managedAccount.resources.deploymentRole,
      previewAccount: true,
    },
  });
};
/* eslint-enable */

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
    let user = getLoggedInUser();
    let tenantName = serverless.service.tenant;
    if (tenantName && user) {
      const awsPreviewManagedAccount = await getAwsPreviewManagedAccount({
        accessKey: await resolveAccessKey(user, tenantName),
        tenantName,
      });
      if (awsPreviewManagedAccount && awsPreviewManagedAccount.status === STATUS_EXPIRED) {
        return originalShouldSetupAwsCredentials(serverless);
      }
      user = getLoggedInUser(); // Token might have been refreshed
    }

    const registrationType = await registrationTypeChoice();
    switch (registrationType) {
      case 'preview': {
        if (!user) {
          process.stdout.write(
            '\nTo enable a free preview account, you must have a Serverless account.\n\n'
          );
          await registerSteps.registerOrLogin(serverless);
          user = getLoggedInUser();
        }
        const setAppOptions = await setAppCheck(serverless);
        if (setAppOptions) {
          process.stdout.write(
            '\nTo enable a free preview account, ' +
              'a Serverless Dashboard access needs to be configured for the service.\n\n'
          );
          setAppSteps.enableConfirm = async () => true; // Mute unwanted prompt
          await setAppRun(serverless, setAppOptions);
          if (!serverless.service.tenant) return null; // Non YAML config, cannot proceed
        }
        tenantName = serverless.service.tenant;
        const accessKey = await resolveAccessKey(user, tenantName);
        let awsPreviewManagedAccount = await getAwsPreviewManagedAccount({ accessKey, tenantName });
        user = getLoggedInUser(); // Token might have been refreshed

        if (!awsPreviewManagedAccount) {
          const captchaToken = await resolveCaptchaToken();
          awsPreviewManagedAccount = await createAwsPreviewManagedAccount(
            accessKey,
            serverless.service.tenant,
            captchaToken
          );
        } else if (awsPreviewManagedAccount.status === STATUS_EXPIRED) {
          process.stdout.write(
            '\nFree preview account has already expired. Use own AWS account instead.\n\n'
          );
          return true;
        }

        while (awsPreviewManagedAccount.status === STATUS_IN_PROGRESS) {
          await sleep(2000);
          awsPreviewManagedAccount = await getAwsPreviewManagedAccount({ accessKey, tenantName });
        }
        await setDeploymentProfileAccessRole(ctx, accessKey, awsPreviewManagedAccount);

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
