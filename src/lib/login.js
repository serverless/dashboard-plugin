import { login } from '@serverless/platform-sdk'

export default async function(ctx) {
  ctx.sls.cli.log('Logging you in via your default browser...', 'Serverless Enterprise')
  // Include a "tenant" in "login()"...
  // This will create a new accessKey for that tenant on every login.
  return login(ctx.sls.service.tenant).then(() => {
    ctx.sls.cli.log('You sucessfully logged in to Serverless Enterprise.', 'Serverless Enterprise')
    process.exit(0)
  })
}
