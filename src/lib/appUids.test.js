import appUids from './appUids'
import { getApp } from '@serverless/platform-sdk'

jest.mock('@serverless/platform-sdk', () => ({
  getApp: jest.fn().mockReturnValue(Promise.resolve({ appUid: 'AUID', tenantUid: 'TUID' }))
}))

describe('appUids', () => {
  it('returns app uid', async () => {
    const uids = await appUids('tenant', 'app')
    expect(getApp).toBeCalledWith({ tenant: 'tenant', app: 'app' })
    expect(uids).toEqual({ appUid: 'AUID', tenantUid: 'TUID' })
  })
})
