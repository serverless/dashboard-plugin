import { login } from '@serverless/platform-sdk'

export default async function(ctx) {
  ctx.sls.cli.log('Logging you in via your default browser...', 'Serverless Enterprise')
  // Include a "tenant" in "login()"...
  // This will create a new accessKey for that tenant on every login.
  try {
    await login(ctx.sls.service.tenant)
  } catch (err) {
    if (err === 'Complete sign-up before logging in.') {
      ctx.sls.cli.log(err, 'Serverless Enterprise')
      process.exit(1)
    }
  }
  ctx.sls.cli.log('You sucessfully logged in to Serverless Enterprise.', 'Serverless Enterprise')
  process.exit(0)
}
