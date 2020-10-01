'use strict';

const { getLoggedInUser, logout } = require('@serverless/platform-sdk');

module.exports = async function (ctx) {
  const user = getLoggedInUser();

  if (!user) {
    ctx.sls.cli.log('You are already logged out');
    return;
  }

  await logout();
  ctx.sls.cli.log('You successfully logged out of Serverless.');
};
