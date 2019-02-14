import frameworkVersionPolicy from './framework-version'

describe('frameworkVersionPolicy', () => {
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), warn: jest.fn(), Failure: Error }
  })

  it('passes if version is the same', () => {
    frameworkVersionPolicy(policy, { frameworkVerison: '1.37.1'}, '1.37.1')
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('passes if version satisfies range', () => {
    frameworkVersionPolicy(policy, { frameworkVerison: '1.37.1'}, '>1.37.0 <2.0.0')
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('passes if version satisfies caret range', () => {
    frameworkVersionPolicy(policy, { frameworkVerison: '1.37.1'}, '^1.37.0')
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('forbids if exact version does not match', () => {
    expect(() => frameworkVersionPolicy(policy, { frameworkVerison: '1.37.1'}, '1.37.0')).toThrow(
      'Serverless Framework version 1.37.1 does not satisfy version requirement: 1.37.0')
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('forbids if version range does not match', () => {
    expect(() => frameworkVersionPolicy(policy, { frameworkVerison: '1.37.1'}, '<1.37.1')).toThrow(
      'Serverless Framework version 1.37.1 does not satisfy version requirement: <1.37.1')
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })
})
