import noSecretEnvVarsPolicy from './no-secret-env-vars'

describe('noSecretEnvVarsPolicy', () => {
  let policy
  let service

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
    service = {
      compiled: { 'cloudformation-template-update-stack.json': { Resources: {} } },
      declaration: {
        functions: {
          func: {}
        }
      },
      provider: { naming: { getLambdaLogicalId: (fnName) => `${fnName}Lambda` } }
    }
  })

  it('allows functions with a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: { Environment: { Variables: { FOOBAR: 'non-sensitive' } } }
    }
    noSecretEnvVarsPolicy(policy, service)
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('blocks functions with out a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { Environment: { Variables: { FOOBAR: '-----BEGIN RSA PRIVATE KEY-----' } } }
    }
    noSecretEnvVarsPolicy(policy, service)
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith(
      `Environment variable FOOBAR on function 'func' looks like it contains a secret value`
    )
  })
})
