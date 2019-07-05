const allowedRegionsPolicy = require('./allowed-regions')

describe('allowedRegionsPolicy', () => {
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
  })

  it('allows us-east-1 with options ["us-east-1"]', () => {
    const getRegion = jest.fn().mockReturnValue('us-east-1')
    allowedRegionsPolicy(policy, { provider: { getRegion } }, ['us-east-1'])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allows us-east-1 with options ["us-east-1", "us-east-2"]', () => {
    const getRegion = jest.fn().mockReturnValue('us-east-1')
    allowedRegionsPolicy(policy, { provider: { getRegion } }, ['us-east-1', 'us-east-2'])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('forbids us-east-1 with options ["us-east-2"]', () => {
    const getRegion = jest.fn().mockReturnValue('us-east-1')

    allowedRegionsPolicy(policy, { provider: { getRegion } }, ['us-east-2'])
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith(
      'Region "us-east-1" not in list of permitted regions: ["us-east-2"]'
    )
  })
})
