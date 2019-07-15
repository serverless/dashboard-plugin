'use strict';

const requiredStackTagsPolicy = require('./required-stack-tags');

describe('requiredStackTagsPolicy', () => {
  let policy;
  let declaration;

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() };
    declaration = { provider: {} };
  });

  it('passes if specified tags are present', () => {
    declaration.provider.stackTags = { foo: 'bar', floo: 'baz' };
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' });
    expect(policy.approve).toHaveBeenCalledTimes(1);
    expect(policy.fail).toHaveBeenCalledTimes(0);
  });

  it('forbids if specified tags are missing', () => {
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' });
    expect(policy.approve).toHaveBeenCalledTimes(0);
    expect(policy.fail).toBeCalledWith('Required stack tag foo not set');
  });

  it('forbids if specified tag doesnt match RegExp', () => {
    declaration.provider.stackTags = { foo: 'baz' };
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' });
    expect(policy.approve).toHaveBeenCalledTimes(0);
    expect(policy.fail).toBeCalledWith(
      'Required stack tag foo value baz does not match RegExp: bar'
    );
  });
});
