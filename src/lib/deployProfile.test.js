import { getAccessKeyForTenant, getDeployProfile } from '@serverless/platform-sdk'
import { hookIntoVariableGetter } from './variables'
import { configureDeployProfile } from './deployProfile'

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey')),
  getDeployProfile: jest.fn().mockReturnValue(
    Promise.resolve({
      secretValues: [{ secretName: 'name', secretProperties: { value: 'value' } }]
    })
  )
}))

jest.mock('./variables', () => ({ hookIntoVariableGetter: jest.fn() }))

describe('configureDeployProfile', () => {
  it('gets creds & profile then sets safeguards and hooks into variable system', async () => {
    const getStage = jest.fn().mockReturnValue('stage')
    const sls = {
      provider: { getStage },
      sls: { service: { app: 'app', tenant: 'tenant', service: 'service' } }
    }
    await configureDeployProfile(sls)
    expect(getAccessKeyForTenant).toBeCalledWith('tenant')
    expect(getDeployProfile).toBeCalledWith({
      accessKey: 'accessKey',
      app: 'app',
      tenant: 'tenant',
      service: 'service',
      stage: 'stage'
    })
    expect(hookIntoVariableGetter).toBeCalledWith(sls, { name: 'value' })
  })
})
