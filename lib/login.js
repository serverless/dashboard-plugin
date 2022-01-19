'use strict';

const open = require('open');
const { ServerlessSDK } = require('@serverless/platform-client');
const configUtils = require('@serverless/utils/config');
const { legacy, style } = require('@serverless/utils/log');
const log = require('./log');
const chalk = require('chalk');

module.exports = async function ({ isInteractive } = {}) {
  // TODO: Logging should be unified after implementing: https://github.com/serverless/serverless/issues/1720
  if (isInteractive) {
    legacy.write('\nLogging you in via your default browser...\n');
  } else {
    legacy.log('Logging you in via your default browser...');
  }
  log.notice('Logging in the Serverless Dashboard via the browser');

  const sdk = new ServerlessSDK();

  if (process.env.SLS_INTERACTIVE_SETUP_TEST) {
    legacy.log('...aborted (test run)');
    log.notice('...aborted (test run)');
    return;
  }
  const { loginUrl, loginData: loginDataDeferred } = await sdk.login();

  open(loginUrl);
  if (isInteractive) {
    legacy.write(
      `\nIf your browser does not open automatically, please open the URL: ${loginUrl}\n`
    );
  } else {
    legacy.log(`If your browser does not open automatically, please open the URL: ${loginUrl}`);
  }
  log.notice(
    style.aside('If your browser does not open automatically, please open this URL:', loginUrl)
  );

  const loginData = await loginDataDeferred;

  // In `.serverlessrc`, we want to use `user_uid` as `userId` if possible
  const userId = loginData.user_uid || loginData.id;

  const loginDataToSaveInConfig = {
    userId,
    users: {
      [userId]: {
        userId,
        name: loginData.name,
        email: loginData.email,
        username: loginData.username,
        dashboard: {
          refreshToken: loginData.refreshToken,
          accessToken: loginData.accessToken,
          idToken: loginData.idToken,
          expiresAt: loginData.expiresAt,
          username: loginData.username,
        },
      },
    },
  };

  // save the login data in the rc file
  configUtils.set(loginDataToSaveInConfig);

  if (isInteractive) {
    legacy.write(chalk.green('\nYou sucessfully logged in to Serverless\n'));
  } else {
    legacy.log('You sucessfully logged in to Serverless.');
  }
  log.notice();
  log.notice.success('You are now logged in the Serverless Dashboard');
};
