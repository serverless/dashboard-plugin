import { hookIntoVariableGetter } from './variables'

describe('variables - hookIntoVariableGetter', () => {
  const getValueFromSource = jest.fn().mockReturnValue('frameworkVariableValue')
  const serverless = {
    service: {
      app: 'app',
      service: 'service',
      tenant: 'tenant'
    },
    variables: { getValueFromSource },
    processedInput: {
      commands: []
    }
  }
  const state = { secretsUsed: new Set() }

  afterAll(() => {
    getValueFromSource.resetMock()
  })

  it('overrides the default variable getter', async () => {
    const restore = hookIntoVariableGetter({ sls: serverless, state }, { name: 'secretValue' })
    expect(serverless.variables.getValueFromSource).not.toEqual(getValueFromSource)
    serverless.variables.getValueFromSource('secrets:name')
    expect(state.secretsUsed).toEqual(new Set(['name']))
    restore()
    expect(serverless.variables.getValueFromSource).toEqual(getValueFromSource)
  })
})
