import appUid from './appUid'
import { getApp } from '@serverless/platform-sdk'

jest.mock('@serverless/platform-sdk', () => ({
  getApp: jest.fn().mockReturnValue(Promise.resolve({ appUid: 'UID' }))
}))

describe('appUid', () => {
  it('returns app uid', async () => {
    const uid = await appUid('tenant', 'app')
    expect(getApp).toBeCalledWith({ tenant: 'tenant', app: 'app' })
    expect(uid).toEqual('UID')
  })
})
