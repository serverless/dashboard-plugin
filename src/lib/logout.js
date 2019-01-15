import { logout } from '@serverless/platform-sdk'

export default async function(ctx) {
  ctx.sls.cli.log('Serverless Enterprise will now log you out.')
  return logout().then((d) => {
    console.log(d.users, 'made it')
    ctx.sls.cli.log('You sucessfully logged out of Serverless Enterprise.')
    process.exit(0)
  })
}
