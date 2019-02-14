import requiredStackTagsPolicy from './required-stack-tags'

describe('requiredStackTagsPolicy', () => {
  let policy
  let declaration

  beforeEach(() => {
    policy = { approve: jest.fn(), warn: jest.fn(), Failure: Error }
    declaration = { provider: {} }
  })

  it('passes if specified tags are present', () => {
    declaration.provider.stackTags = { foo: 'bar', floo: 'baz' }
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('forbids if specified tags are missing', () => {
    expect(() => requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' })).toThrow(
      'Required stack tag foo not set'
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('forbids if specified tag doesnt match RegExp', () => {
    declaration.provider.stackTags = { foo: 'baz' }
    expect(() => requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' })).toThrow(
      'Required stack tag foo value baz does not match RegExp: bar'
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })
})
