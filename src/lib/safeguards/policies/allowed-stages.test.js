'use strict';

const allowedStagePolicy = require('./allowed-stages')

describe('allowedStagePolicy', () => {
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
  })

  it('allows dev with options ["dev"]', () => {
    const getStage = jest.fn().mockReturnValue('dev')
    allowedStagePolicy(policy, { provider: { getStage } }, ['dev'])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allows dev with options ["prod", "dev"]', () => {
    const getStage = jest.fn().mockReturnValue('dev')
    allowedStagePolicy(policy, { provider: { getStage } }, ['prod', 'dev'])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('forbids dev with options ["prod"]', () => {
    const getStage = jest.fn().mockReturnValue('dev')

    allowedStagePolicy(policy, { provider: { getStage } }, ['prod'])
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Stage name "dev" not in list of permitted names: ["prod"]')
  })

  it('allows dev with options "(dev|prod)"', () => {
    const getStage = jest.fn().mockReturnValue('dev')
    allowedStagePolicy(policy, { provider: { getStage } }, '(dev|prod)')
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('forbids dev with options "(prod|stg)"', () => {
    const getStage = jest.fn().mockReturnValue('dev')

    allowedStagePolicy(policy, { provider: { getStage } }, '(prod|stg)')
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Stage name "dev" not permitted by RegExp: "(prod|stg)"')
  })
})
