'use strict';

const { logout } = require('@serverless/platform-sdk');

module.exports = async function(ctx) {
  return logout().then(() => {
    ctx.sls.cli.log('You sucessfully logged out of Serverless.');
    process.exit(0);
  });
};
