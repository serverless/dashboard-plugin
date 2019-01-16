import { logout } from '@serverless/platform-sdk'

export default async function(ctx) {
  return logout().then(() => {
    ctx.sls.cli.log('You sucessfully logged out of Serverless Enterprise.', 'Serverless Enterprise')
    process.exit(0)
  })
}
