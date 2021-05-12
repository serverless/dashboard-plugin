'use strict';

const _ = require('lodash');
const { ServerlessSDK } = require('@serverless/platform-client');
const login = require('../../login');
const configUtils = require('@serverless/utils/config');

const loginOrRegisterQuestion = async (inquirer) =>
  (
    await inquirer.prompt({
      message: 'Do you want to login/register to Serverless Dashboard?',
      type: 'list',
      name: 'shouldLoginOrRegister',
      choices: ['Yes', 'No'],
    })
  ).shouldLoginOrRegister;

const steps = {
  loginOrRegister: async (context) => {
    const result = await loginOrRegisterQuestion(context.inquirer);
    if (result === 'Yes') {
      await login();
    }
  },
};

module.exports = {
  async isApplicable({ configuration, options }) {
    if (
      _.get(configuration, 'provider') !== 'aws' &&
      _.get(configuration, 'provider.name') !== 'aws'
    ) {
      return false;
    }
    if (process.env.SERVERLESS_ACCESS_KEY) return false;
    const sdk = new ServerlessSDK();
    const { supportedRegions, supportedRuntimes } = await sdk.metadata.get();
    if (!supportedRuntimes.includes(_.get(configuration.provider, 'runtime') || 'nodejs12.x')) {
      return false;
    }
    if (
      !supportedRegions.includes(options.region || configuration.provider.region || 'us-east-1')
    ) {
      return false;
    }
    return !configUtils.getLoggedInUser();
  },
  async run(context) {
    process.stdout.write('You are not logged in or you do not have a Serverless account.\n\n');
    return steps.loginOrRegister(context);
  },
  steps,
};
