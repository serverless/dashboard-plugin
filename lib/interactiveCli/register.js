'use strict';

const chalk = require('chalk');
const {
  createApp,
  getLoggedInUser,
  getMetadata,
  login,
  register: sdkRegister,
  writeConfigFile,
} = require('@serverless/platform-sdk');
const sdkVersion = require('@serverless/platform-sdk/package').version;
const enableConfirm = require('./enableConfirm');
const writeOrgAndApp = require('./writeOrgAndApp');

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

const register = async (...args) => {
  const result = await sdkRegister(...args);
  result.orgName = result.tenantName;
  delete result.tenantName;
  return result;
};

const registerQuestion = async (inquirer) =>
  (
    await inquirer.prompt({
      message: 'Do you want to login or register?',
      type: 'list',
      name: 'accessMode',
      choices: ['register', 'login'],
    })
  ).accessMode;

const emailInput = async (inquirer) =>
  (
    await inquirer.prompt({
      message: 'email:',
      type: 'input',
      name: 'dashboardEmail',
      validate: (input) => {
        input = input.trim().toLowerCase();
        if (isValidEmail(input)) return true;
        return 'Provided email address is not valid';
      },
    })
  ).dashboardEmail
    .trim()
    .toLowerCase();

const passwordInput = async (inquirer) =>
  (
    await inquirer.prompt({
      message: 'password:',
      type: 'password',
      name: 'dashboardPassword',
      validate: (input) => {
        if (input.trim().length >= 7) return true;
        return 'Password needs to have at least 7 characters';
      },
    })
  ).dashboardPassword.trim();

const sdkSignUp = async (email, password, userName, orgName) => {
  try {
    return await register(email, password, userName, orgName, orgName);
  } catch (error) {
    const errorData = (() => {
      try {
        return JSON.parse(error.message);
      } catch (parseError) {
        throw error;
      }
    })();
    if (!errorData || !errorData.errorMessage) throw error;
    if (errorData.errorMessage.includes('this username already exists')) {
      const trailingNumberMatches = userName.match(/^(.*)(\d+)$/);
      if (trailingNumberMatches) {
        userName = trailingNumberMatches[1] + (Number(trailingNumberMatches[2]) + 1);
      } else {
        userName += '2';
      }
      return sdkSignUp(email, password, userName, orgName);
    }
    if (errorData.errorMessage.includes('tenant with this name already exists')) {
      const trailingNumberMatches = orgName.match(/^(.*)(\d+)$/);
      if (trailingNumberMatches) {
        orgName = trailingNumberMatches[1] + (Number(trailingNumberMatches[2]) + 1);
      } else {
        orgName += '2';
      }
      return sdkSignUp(email, password, userName, orgName);
    }
    if (errorData.errorMessage.includes('"tenantName" length must be at least')) {
      orgName += 'x';
      return sdkSignUp(email, password, userName, orgName);
    }
    error.sdkMessage = errorData.errorMessage;
    throw error;
  }
};

const generateUserName = (email) => {
  let userName = email.slice(0, email.indexOf('@')).replace(/[^a-z0-9]+/g, '');
  if (userName.length === 0) {
    userName = email.slice(1 + email.indexOf('@')).replace(/[^a-z0-9]+/g, '');
  }
  userName += 'x'.repeat(Math.max(5 - userName.length, 0));
  return userName;
};

const keepValidOrgNameChars = (name) => name.replace(/[^a-zA-Z0-9]/g, '');
const generateOrgName = (email) => {
  const userName = generateUserName(email);
  return keepValidOrgNameChars(userName);
};

const signUp = async (inquirer, email = null) => {
  if (!email) email = await emailInput(inquirer);
  const password = await passwordInput(inquirer);
  const userName = generateUserName(email);
  const orgName = generateOrgName(email);

  try {
    return await sdkSignUp(email, password, userName, orgName);
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

const validadateRegistrationResponseValue = (name, value) => {
  if (!value) throw new Error(`Missing ${name} in register response`);
};

const steps = {
  registerOrLogin: async (serverless) => {
    const { inquirer } = serverless.interactiveCli;
    const registerOrLogin = await registerQuestion(inquirer);
    if (registerOrLogin === 'login') {
      await login();
      return;
    }
    const { ownerUserName, orgName, ownerAccessKey, ownerAuth0Id } = await signUp(inquirer);
    validadateRegistrationResponseValue('ownerUserName', ownerUserName);
    validadateRegistrationResponseValue('tenantName', orgName);
    validadateRegistrationResponseValue('ownerAccessKey', ownerAccessKey);
    validadateRegistrationResponseValue('ownerAuth0Id', ownerAuth0Id);
    writeConfigFile({
      userId: ownerAuth0Id,
      users: {
        [ownerAuth0Id]: {
          userId: ownerAuth0Id,
          userName: ownerUserName,
          enterprise: {
            versionSDK: sdkVersion,
            timeLastLogin: Math.round(Date.now() / 1000),
          },
          dashboard: {
            accessKeys: {
              [orgName]: ownerAccessKey,
            },
            username: ownerUserName,
          },
        },
      },
    });

    process.stdout.write(`\n${chalk.green('Successfully registered your new account')}\n`);

    const { appName } = await createApp({
      tenant: orgName,
      app: `${serverless.service.service}-app`,
      token: ownerAccessKey,
    });

    await writeOrgAndApp(serverless, orgName, appName);
  },
};

module.exports = {
  async check(serverless) {
    if (!serverless.config.servicePath) return false;
    if (serverless.service.provider.name !== 'aws') {
      return false;
    }
    const { supportedRegions, supportedRuntimes } = await getMetadata();
    if (!supportedRuntimes.includes(serverless.service.provider.runtime || 'nodejs10.x')) {
      return false;
    }
    if (!supportedRegions.includes(serverless.getProvider('aws').getRegion())) {
      return false;
    }
    return !getLoggedInUser();
  },
  async run(serverless) {
    const { inquirer } = serverless.interactiveCli;
    if (!(await enableConfirm(inquirer, serverless.processedInput.options))) {
      return null;
    }
    process.stdout.write('You are not logged in or you do not have a Serverless account.\n\n');
    return steps.registerOrLogin(serverless);
  },
  steps,
};
