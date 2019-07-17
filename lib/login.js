'use strict';

const { login } = require('@serverless/platform-sdk');

module.exports = async function(ctx) {
  ctx.sls.cli.log('Logging you in via your default browser...');
  // Include a "tenant" in "login()"...
  // This will create a new accessKey for that tenant on every login.
  try {
    await login(ctx.sls.service.tenant);
  } catch (err) {
    if (err === 'Complete sign-up before logging in.') {
      ctx.sls.cli.log(
        "Please complete sign-up at dashboard.serverless.com, configure your service with the tenant and application (documentation - https://git.io/fjl3F) and run 'serverless login' again"
      );
      process.exit(1);
    }
  }
  ctx.sls.cli.log('You sucessfully logged in to Serverless Enterprise.');
  if (!ctx.sls.service.tenant || !ctx.sls.service.app) {
    ctx.sls.cli.log(
      "Please configure your service with the tenant and application (documentation - https://git.io/fjl3F) and run 'serverless login' again"
    );
  }
  process.exit(0);
};
