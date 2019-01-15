import { login } from '@serverless/platform-sdk'

export default async function(ctx) {
  ctx.sls.cli.log('Serverless Enterprise will now log you in via your default browser...')
  return login().then((d) => {
    console.log(d.users, 'made it')
    ctx.sls.cli.log('You sucessfully logged into Serverless Enterprise.')
    process.exit(0)
  })
}
