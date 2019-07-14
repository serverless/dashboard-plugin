'use strict';

const chalk = require('chalk');
const {
  createApp,
  getLoggedInUser,
  register,
  writeConfigFile,
} = require('@serverless/platform-sdk');
const sdkVersion = require('@serverless/platform-sdk/package').version;
const enableConfirm = require('./enableConfirm');
const writeTenantAndApp = require('./writeTenantAndApp');

const isValidEmail = RegExp.prototype.test.bind(
  new RegExp(
    "^(?:[a-z0-9!#$%&'*+/=?^_`{|}~\u007f-\uffff-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`" +
      '{|}~\\u007f-\\uffff-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-' +
      '\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@(?:(?:[a-z0-9](?:[a-' +
      'z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]' +
      '|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]' +
      '[0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-' +
      '\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$'
  )
);
const isEmailApplicableForUsernameSeclusion = RegExp.prototype.test.bind(/^.*[a-zA-Z0-9].*@/);

const emailInput = async inquirer =>
  (await inquirer.prompt({
    message: 'email:',
    type: 'input',
    name: 'dashboardEmail',
    validate: input => {
      input = input.trim().toLowerCase();
      if (isValidEmail(input) && isEmailApplicableForUsernameSeclusion(input)) return true;
      return 'Provided email address is not valid';
    },
  })).dashboardEmail
    .trim()
    .toLowerCase();

const passwordInput = async inquirer =>
  (await inquirer.prompt({
    message: 'password:',
    type: 'password',
    name: 'dashboardPassword',
    validate: input => {
      if (input.trim().length >= 7) return true;
      return 'Password needs to have at least 7 characters';
    },
  })).dashboardPassword.trim();

const generateUserName = email => {
  let userName = email.slice(0, email.indexOf('@')).replace(/[^a-z0-9]+/g, '');
  userName += 'x'.repeat(Math.max(5 - userName.length, 0));
  return userName;
};

const sdkSignUp = async (email, password, userName) => {
  try {
    return await register(email, password, userName, userName, userName);
  } catch (error) {
    const errorData = (() => {
      try {
        return JSON.parse(error.message);
      } catch (parseError) {
        throw error;
      }
    })();
    if (!errorData || !errorData.errorMessage) throw error;
    if (errorData.errorMessage.includes('tenant with this name already exists')) {
      const trailingNumberMatches = userName.match(/^(.*)(\d+)$/);
      if (trailingNumberMatches) {
        userName = trailingNumberMatches[1] + (Number(trailingNumberMatches[2]) + 1);
      } else {
        userName += '2';
      }
      return sdkSignUp(email, password, userName);
    }
    if (errorData.errorMessage.includes('"tenantName" length must be at least')) {
      userName += 'x';
      return await register(email, password, userName, userName, userName);
    }
    error.sdkMessage = errorData.errorMessage;
    throw error;
  }
};

const signUp = async (inquirer, email = null) => {
  if (!email) email = await emailInput(inquirer);
  const password = await passwordInput(inquirer);
  const userName = generateUserName(email);

  try {
    return await sdkSignUp(email, password, userName);
  } catch (error) {
    if (error.sdkMessage) {
      if (error.sdkMessage.includes('user already exists')) {
        // There's already account with given email registered
        process.stdout.write(
          chalk.red(
            "There's already registered account for given email address. Please try different email address\n"
          )
        );
        return signUp(inquirer);
      }
      if (error.sdkMessage.includes('PasswordStrengthError')) {
        process.stdout.write(chalk.red('Password is too weak. Please try different one\n'));
        return signUp(inquirer, email);
      }
    }
    throw error;
  }
};

module.exports = {
  check(serverless) {
    if (!serverless.config.servicePath) return false;
    if (serverless.service.provider.name !== 'aws') return false;
    if (serverless.service.tenant || serverless.service.app) return false;
    return !getLoggedInUser();
  },
  async run(serverless) {
    const { inquirer } = serverless.interactiveCli;
    if (!(await enableConfirm(inquirer))) return null;
    process.stdout.write('You are not logged in or you do not have a Serverless account.\n\n');
    if (
      !(await inquirer.prompt({
        message: 'Do you want to register?',
        type: 'confirm',
        name: 'isConfirmed',
      })).isConfirmed
    ) {
      process.stdout.write(
        'If you have a Serverless account you can run “serverless login” to\n' +
          'login and then run “serverless” again to finish setup.\n'
      );
      return null;
    }

    const { ownerUserName, tenantName, ownerAccessKey } = await signUp(inquirer);
    // TODO: confirm how to generate config file
    // const userId = '?';
    // const idToken = '?';
    // writeConfigFile({
    //   userId,
    //   users: {
    //     [userId]: {
    //       userId,
    //       email,
    //       userName: ownerUserName,
    //       enterprise: {
    //         versionSDK: sdkVersion,
    //         timeLastLogin: Math.round(Date.now() / 1000),
    //       },
    //       dashboard: {
    //         accessKeys: {
    //           [tenantName]: ownerAccessKey,
    //         },
    //         username: userName,
    //         idToken,
    //       },
    //     },
    //   },
    // });

    process.stdout.write(`\n${chalk.green('Successfully registered your new account')}\n`);

    const { appName } = await createApp({
      tenant: tenantName,
      app: `${serverless.service.service}-app`,
      token: ownerAccessKey,
    });

    if (await writeTenantAndApp(serverless, tenantName, appName)) {
      process.stdout.write(
        `\n${chalk.bold('Deploy your new project and monitor, troubleshoot and test it:')}\n` +
          '- Run “serverless deploy” to deploy your service\n' +
          '- Run “serverless dashboard” to view the dashboard\n'
      );
    }
  },
};