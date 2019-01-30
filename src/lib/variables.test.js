import { getSecret, getAccessKeyForTenant } from '@serverless/platform-sdk'
import { getSecretFromEnterprise, hookIntoVariableGetter } from './variables'

jest.mock('@serverless/platform-sdk', () => ({
  getSecret: jest.fn().mockReturnValue(Promise.resolve('SECRET!')),
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey'))
}))

describe('variables - getSecretFromEnterprise', () => {
  it('gets the access key and grabs the secret from backend', async () => {
    await getSecretFromEnterprise({ secretName: 'name', tenant: 'tenant' })
    expect(getAccessKeyForTenant).toBeCalledWith('tenant')
    expect(getSecret).toBeCalledWith({
      secretName: 'name',
      accessKey: 'accessKey'
    })
  })
})

describe('variables - hookIntoVariableGetter', () => {
  const getValueFromSource = jest.fn().mockReturnValue('frameworkVariableValue')
  const sls = {
    service: { tenant: 'tenant' },
    variables: { getValueFromSource }
  }

  afterAll(() => {
    getValueFromSource.resetMock()
  })

  it('overrides the default variable getter', async () => {
    const restore = hookIntoVariableGetter(sls)
    expect(sls.variables.getValueFromSource).not.toEqual(getValueFromSource)
    restore()
    expect(sls.variables.getValueFromSource).toEqual(getValueFromSource)
  })
})
