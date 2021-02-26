'use strict';

const open = require('open');
const { ServerlessSDK } = require('@serverless/platform-client');
const configUtils = require('@serverless/utils/config');

module.exports = async function (ctx) {
  ctx.sls.cli.log('Logging you in via your default browser...');

  const sdk = new ServerlessSDK();

  const { loginUrl, loginData: loginDataDeferred } = await sdk.login();

  open(loginUrl);

  const loginData = await loginDataDeferred;

  const loginDataToSaveInConfig = {
    userId: loginData.id,
    users: {
      [loginData.id]: {
        userId: loginData.id,
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

  ctx.sls.cli.log('You sucessfully logged in to Serverless.');
  if (!ctx.sls.service.org || !ctx.sls.service.app) {
    ctx.sls.cli.log("Please run 'serverless' to configure your service");
  }
};
