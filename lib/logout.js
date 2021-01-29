'use strict';

const accountUtils = require('@serverless/utils/account');
const configUtils = require('@serverless/utils/config');

module.exports = async function (ctx) {
  const user = configUtils.getLoggedInUser();

  if (!user) {
    ctx.sls.cli.log('You are already logged out');
    return;
  }

  accountUtils.logout();
  ctx.sls.cli.log('You successfully logged out of Serverless.');
};
