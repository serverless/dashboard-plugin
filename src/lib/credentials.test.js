import getCredentialsLocal from './credentials'
import { getCredentials } from '@serverless/platform-sdk'

jest.mock('@serverless/platform-sdk', () => ({
  getCredentials: jest.fn().mockReturnValue({
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    sessionToken: 'sessionToken'
  })
}))

afterAll(() => jest.restoreAllMocks())

describe('credentials', () => {
  it('calls API func and sets env vars', async () => {
    process.env.SLS_CLOUD_ACCESS = 'true'
    const log = jest.fn()
    const ctx = { sls: { cli: { log } } }
    await getCredentialsLocal(ctx)
    expect(getCredentials).toBeCalledWith(ctx)
    expect(log).toBeCalledWith('Cloud credentials set from Serverless Platform.')
    expect(process.env.AWS_ACCESS_KEY_ID).toEqual('accessKeyId')
    expect(process.env.AWS_SECRET_ACCESS_KEY).toEqual('secretAccessKey')
    expect(process.env.AWS_SESSION_TOKEN).toEqual('sessionToken')
  })
})
