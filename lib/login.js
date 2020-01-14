'use strict';

const { login } = require('@serverless/platform-sdk');

module.exports = async function(ctx) {
  ctx.sls.cli.log('Logging you in via your default browser...');
  // Include a "org" in "login()"...
  // This will create a new accessKey for that org on every login.
  try {
    await login(ctx.sls.service.tenant);
  } catch (err) {
    if (err === 'Complete sign-up before logging in.') {
      ctx.sls.cli.log(
        "Please complete sign-up at dashboard.serverless.com, then run 'serverless' to configure your service"
      );
      process.exit(1);
    }
  }
  ctx.sls.cli.log('You sucessfully logged in to Serverless.');
  if (!ctx.sls.service.tenant || !ctx.sls.service.app) {
    ctx.sls.cli.log("Please run 'serverless' to configure your service");
  }
  process.exit(0);
};
