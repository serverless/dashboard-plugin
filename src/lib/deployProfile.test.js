import { getAccessKeyForTenant, getDeployProfile } from '@serverless/platform-sdk'
import { hookIntoVariableGetter } from './variables'
import { configureDeployProfile } from './deployProfile'

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey')),
  getDeployProfile: jest.fn().mockReturnValue(
    Promise.resolve({
      secretValues: [{ secretName: 'name', secretProperties: { value: 'value' } }],
      safeguardsPolicies: [{ policy: 'name' }],
      credentials: { accessKeyId: 'id', secretAccessKey: 'secret' }
    })
  )
}))

jest.mock('./variables', () => ({ hookIntoVariableGetter: jest.fn() }))

describe('configureDeployProfile', () => {
  it('gets creds & secrets then sets safeguards and hooks into variable system', async () => {
    const getStage = jest.fn().mockReturnValue('stage')
    const ctx = {
      provider: { getStage },
      sls: {
        service: { app: 'app', tenant: 'tenant', service: 'service', provider: { name: 'aws' } }
      }
    }
    await configureDeployProfile(ctx)
    expect(ctx.safeguards).toEqual([{ policy: 'name' }])
    expect(getAccessKeyForTenant).toBeCalledWith('tenant')
    expect(getDeployProfile).toBeCalledWith({
      accessKey: 'accessKey',
      app: 'app',
      tenant: 'tenant',
      service: 'service',
      stage: 'stage'
    })
    expect(hookIntoVariableGetter).toBeCalledWith(ctx, { name: 'value' })
    expect(ctx.sls.service.provider.credentials).toEqual({
      accessKeyId: 'id',
      secretAccessKey: 'secret'
    })
  })
})
