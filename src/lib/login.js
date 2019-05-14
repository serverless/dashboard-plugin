import { login } from '@serverless/platform-sdk'

export default async function(ctx) {
  ctx.sls.cli.log('Logging you in via your default browser...', 'Serverless Enterprise')
  // Include a "tenant" in "login()"...
  // This will create a new accessKey for that tenant on every login.
  try {
    await login(ctx.sls.service.tenant)
  } catch (err) {
    if (err === 'Complete sign-up before logging in.') {
      ctx.sls.cli.log(
        'Complete sign-up and configure your app & tenant before logging in.',
        'Serverless Enterprise'
      )
      process.exit(1)
    }
  }
  ctx.sls.cli.log('You sucessfully logged in to Serverless Enterprise.', 'Serverless Enterprise')
  if (!ctx.sls.service.tenant || !ctx.sls.service.app) {
    ctx.sls.cli.log(
      "You don't currently have an app & tenant configured in your serverless config, please add them and log in again.",
      'Serverless Enterprise'
    )
  }
  process.exit(0)
}
