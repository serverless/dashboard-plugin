import javascriptPolicy from './javascript'

const serviceData = { declaration: { provider: { stage: 'dev' } } }

describe('javascriptPolicy', () => {
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
  })

  it('allows services with options ["declaration.provider[stage=dev]"]', () => {
    javascriptPolicy(policy, serviceData, [`jsonata("declaration.provider[stage='dev']")`])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allows services with options ["declaration.provider[stage in [dev, staging]"]', () => {
    javascriptPolicy(policy, serviceData, [
      `jsonata("declaration.provider[stage in ['dev','stage']]")`
    ])
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('requires all queries to pass', () => {
    const rules = [
      `jsonata("declaration.provider[stage='dev']")`,
      `jsonata("declaration.provider[stage='prod']")`
    ]
    javascriptPolicy(policy, serviceData, rules)
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toHaveBeenCalledTimes(1)
  })

  it('forbids services with options ["declaration.provider[stage=prod"]', () => {
    javascriptPolicy(policy, serviceData, [`jsonata("declaration.provider[stage='prod']")`])
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Must comply with all of the configured queries.')
  })

  it('forbids invalid queries', () => {
    javascriptPolicy(policy, serviceData, ['this is not a valid query'])
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Error in the policy statement: "this is not a valid query"')
  })

  it('allows javascript statements', () => {
    const rules = [`5==5`]
    javascriptPolicy(policy, serviceData, rules)
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allows javascript statements with services', () => {
    const rules = [`declaration.provider.stage == "dev"`]
    javascriptPolicy(policy, serviceData, rules)
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('forbids failed javascript statements', () => {
    const rules = [`declaration.provider.stage == "prod"`]
    javascriptPolicy(policy, serviceData, rules)
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toHaveBeenCalledTimes(1)
  })
})
