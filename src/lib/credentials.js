import { getCredentials } from '@serverless/platform-sdk'

export default async function(ctx) {
  const { accessKeyId, secretAccessKey, sessionToken } = await getCredentials(ctx)
  process.env.AWS_ACCESS_KEY_ID = accessKeyId
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey
  process.env.AWS_SESSION_TOKEN = sessionToken
  ctx.sls.cli.log('Cloud credentials set from Serverless Platform.')
}
