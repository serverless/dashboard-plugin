import requireGlobalVpcPolicy from './require-global-vpc'

describe('requireGlobalVpcPolicy', () => {
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

  it('allows functions with a VPC config satisfying the default config', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        VpcConfig: {
          SecurityGroupIds: ['foobar'],
          SubnetIds: ['baz', 'bar']
        }
      }
    }
    requireGlobalVpcPolicy(policy, service)
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allows functions with a VPC config satisfying a config requiring only 1 subnet', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        VpcConfig: {
          SecurityGroupIds: ['foobar'],
          SubnetIds: ['baz']
        }
      }
    }
    requireGlobalVpcPolicy(policy, service, { minNumSubnets: 1 })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('blocks functions without VPC config and using the default config', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: {}
    }
    requireGlobalVpcPolicy(policy, service)

    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith(`Function "func" doesn't satisfy global VPC requirement.`)
  })

  it('blocks functions VPC config containing 1 subnet id and and using the default config', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: {
        VpcConfig: {
          SecurityGroupIds: ['foobar'],
          SubnetIds: ['baz']
        }
      }
    }
    requireGlobalVpcPolicy(policy, service)

    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith(
      `Function "func" doesn't satisfy the global VPC requirement of at least 2 subnets.`
    )
  })
})
