'use strict';

const open = require('open');
const { ServerlessSDK } = require('@serverless/platform-client');
const configUtils = require('@serverless/utils/config');
const log = require('@serverless/utils/log');

module.exports = async function ({ isInteractive } = {}) {
  const logOptions = {};
  // We want to remove prefix and change color from yellow in interactive flow only
  if (isInteractive) {
    logOptions.entity = '';
    logOptions.color = 'white';
  }

  log('Logging you in via your default browser...', logOptions);

  const sdk = new ServerlessSDK();

  if (process.env.SLS_INTERACTIVE_SETUP_TEST) {
    log('...aborted (test run)');
    return;
  }
  const { loginUrl, loginData: loginDataDeferred } = await sdk.login();

  open(loginUrl);
  log(`If your browser does not open automatically, please open the URL: ${loginUrl}`, logOptions);

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

  log('You sucessfully logged in to Serverless.', logOptions);
};
