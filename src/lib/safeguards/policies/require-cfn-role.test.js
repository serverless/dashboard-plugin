const requireCfnRolePolicy = require('./require-cfn-role')

describe('requireCfnRolePolicy', () => {
  let policy
  let declaration

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
    declaration = { provider: {} }
  })

  it('passes if cfnRole is set', () => {
    declaration.provider.cfnRole = 'arn:aws:blablabla'
    requireCfnRolePolicy(policy, { declaration })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('forbids if cfnRole is not set', () => {
    requireCfnRolePolicy(policy, { declaration })
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('no cfnRole set')
  })
})
