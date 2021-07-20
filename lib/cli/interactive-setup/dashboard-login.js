'use strict';

// TODO: This whole module should be removed with next major release as the logic has been moved to Framework with https://github.com/serverless/serverless/pull/9766

const _ = require('lodash');
const { ServerlessSDK } = require('@serverless/platform-client');
const login = require('../../login');
const configUtils = require('@serverless/utils/config');
const { StepHistory } = require('@serverless/utils/telemetry');

const loginOrRegisterQuestion = async (inquirer) =>
  (
    await inquirer.prompt({
      message: 'Do you want to login/register to Serverless Dashboard?',
      type: 'confirm',
      name: 'shouldLoginOrRegister',
    })
  ).shouldLoginOrRegister;

const steps = {
  loginOrRegister: async (context) => {
    const result = await loginOrRegisterQuestion(context.inquirer);
    context.stepHistory.set('shouldLoginOrRegister', result);
    if (result) {
      await login({ isInteractive: true });
    }
  },
};

module.exports = {
  async isApplicable(context) {
    const { configuration, options, serviceDir } = context;

    if (!serviceDir) {
      context.inapplicabilityReasonCode = 'NOT_IN_SERVICE_DIRECTORY';
      return false;
    }

    if (
      _.get(configuration, 'provider') !== 'aws' &&
      _.get(configuration, 'provider.name') !== 'aws'
    ) {
      context.inapplicabilityReasonCode = 'NON_AWS_PROVIDER';
      return false;
    }

    if (process.env.SERVERLESS_ACCESS_KEY) {
      context.inapplicabilityReasonCode = 'SERVERLESS_ACCESS_KEY_PROVIDED';
      return false;
    }

    const sdk = new ServerlessSDK();
    const { supportedRegions, supportedRuntimes } = await sdk.metadata.get();
    if (!supportedRuntimes.includes(_.get(configuration.provider, 'runtime') || 'nodejs12.x')) {
      context.inapplicabilityReasonCode = 'UNSUPPORTED_RUNTIME';
      return false;
    }
    if (
      !supportedRegions.includes(options.region || configuration.provider.region || 'us-east-1')
    ) {
      context.inapplicabilityReasonCode = 'UNSUPPORTED_REGION';
      return false;
    }
    const isLoggedIn = Boolean(configUtils.getLoggedInUser());
    if (isLoggedIn) {
      context.inapplicabilityReasonCode = 'ALREADY_LOGGED_IN';
    }
    return !isLoggedIn;
  },
  async run(context) {
    // TODO: Remove check for `StepHistory` after releasing new major version
    if (!_.get(context.stepHistory, 'set')) context.stepHistory = new StepHistory();
    process.stdout.write('You are not logged in or you do not have a Serverless account.\n\n');
    return steps.loginOrRegister(context);
  },
  steps,
  configuredQuestions: ['shouldLoginOrRegister'],
};
