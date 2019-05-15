import { hookIntoVariableGetter } from './variables'
import { getStateVariable } from '@serverless/platform-sdk'

jest.mock('@serverless/platform-sdk', () => ({
  getStateVariable: jest.fn().mockImplementation(({ outputName }) => {
    if (outputName === 'withsubkey') {
      return Promise.resolve({ subkey: 'seeeeeccrreeeetttt' })
    }
    return Promise.resolve('simple seeeeeccrreeeetttt')
  })
}))

describe('variables - hookIntoVariableGetter', () => {
  const getValueFromSource = jest.fn().mockReturnValue('frameworkVariableValue')
  const ctx = {
    sls: {
      service: {
        app: 'app',
        service: 'service',
        tenant: 'tenant'
      },
      variables: { getValueFromSource },
      processedInput: {
        commands: []
      }
    },
    provider: {
      getStage: jest.fn().mockReturnValue('stage'),
      getRegion: jest.fn().mockReturnValue('region')
    },
    state: { secretsUsed: new Set() }
  }

  afterAll(() => {
    getValueFromSource.resetMock()
  })

  it('overrides the default variable getter and can use secrets vars', async () => {
    const restore = hookIntoVariableGetter(ctx, { name: 'secretValue' }, 'accessKey')
    expect(ctx.sls.variables.getValueFromSource).not.toEqual(getValueFromSource)
    const value = await ctx.sls.variables.getValueFromSource('secrets:name')
    expect(value).toEqual('secretValue')
    expect(ctx.state.secretsUsed).toEqual(new Set(['name']))
    restore()
    expect(ctx.sls.variables.getValueFromSource).toEqual(getValueFromSource)
  })

  it('overrides the default variable getter and can fetch state vars with subkey', async () => {
    const restore = hookIntoVariableGetter(ctx, { name: 'secretValue' }, 'accessKey')
    expect(ctx.sls.variables.getValueFromSource).not.toEqual(getValueFromSource)
    const value = await ctx.sls.variables.getValueFromSource('state:service.withsubkey.subkey')
    expect(value).toEqual('seeeeeccrreeeetttt')
    expect(getStateVariable).toBeCalledWith({
      outputName: 'withsubkey',
      service: 'service',
      accessKey: 'accessKey',
      app: 'app',
      tenant: 'tenant',
      region: 'region',
      stage: 'stage'
    })
    restore()
    expect(ctx.sls.variables.getValueFromSource).toEqual(getValueFromSource)
  })

  it('overrides the default variable getter and can fetch state vars without subkey', async () => {
    const restore = hookIntoVariableGetter(ctx, { name: 'secretValue' }, 'accessKey')
    expect(ctx.sls.variables.getValueFromSource).not.toEqual(getValueFromSource)
    const value = await ctx.sls.variables.getValueFromSource('state:service.name')
    expect(value).toEqual('simple seeeeeccrreeeetttt')
    expect(getStateVariable).toBeCalledWith({
      outputName: 'name',
      service: 'service',
      accessKey: 'accessKey',
      app: 'app',
      tenant: 'tenant',
      region: 'region',
      stage: 'stage'
    })
    restore()
    expect(ctx.sls.variables.getValueFromSource).toEqual(getValueFromSource)
  })
})
