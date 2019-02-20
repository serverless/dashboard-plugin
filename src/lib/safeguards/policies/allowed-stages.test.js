import allowedStagePolicy from './allowed-stages'

describe('allowedStagePolicy', () => {
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), warn: jest.fn(), Failure: Error }
  })

  it('allows dev with options ["dev"]', () => {
    const getStage = jest.fn().mockReturnValue('dev')
    allowedStagePolicy(policy, { provider: { getStage } }, ['dev'])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('allows dev with options ["prod", "dev"]', () => {
    const getStage = jest.fn().mockReturnValue('dev')
    allowedStagePolicy(policy, { provider: { getStage } }, ['prod', 'dev'])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('forbids dev with options ["prod"]', () => {
    const getStage = jest.fn().mockReturnValue('dev')

    expect(() => allowedStagePolicy(policy, { provider: { getStage } }, ['prod'])).toThrow(
      'Stage name "dev" not in list of permitted names: ["prod"]'
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('allows dev with options "(dev|prod)"', () => {
    const getStage = jest.fn().mockReturnValue('dev')
    allowedStagePolicy(policy, { provider: { getStage } }, '(dev|prod)')
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('forbids dev with options "(prod|stg)"', () => {
    const getStage = jest.fn().mockReturnValue('dev')

    expect(() => allowedStagePolicy(policy, { provider: { getStage } }, '(prod|stg)')).toThrow(
      'Stage name "dev" not permitted by RegExp: "(prod|stg)"'
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })
})
