import genericPolicy from './generic'

const serviceData = { declaration: { provider: { stage: 'dev' } } }

describe('genericPolicy', () => {
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
  })

  it('allows services with options ["declaration.provider[stage=dev]"]', () => {
    genericPolicy(policy, serviceData, ["declaration.provider[stage='dev']"])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allows services with options ["declaration.provider[stage in [dev, staging]"]', () => {
    genericPolicy(policy, serviceData, ["declaration.provider[stage in ['dev','stage']]"])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('requires all queries to pass', () => {
    const rules = ["declaration.provider[stage='dev']", "declaration.provider[stage='prod']"]
    genericPolicy(policy, serviceData, rules)
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toHaveBeenCalledTimes(1)
  })

  it('forbids services with options ["declaration.provider[stage=prod"]', () => {
    genericPolicy(policy, serviceData, ["declaration.provider[stage='prod']"])
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Must comply with all of the configured queries.')
  })

  it('forbids invalid queries', () => {
    genericPolicy(policy, serviceData, ['this is not a valid query'])
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith(
      'Configuration setting is invalid: "this is not a valid query"'
    )
  })
})
