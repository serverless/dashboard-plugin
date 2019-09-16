'use strict';

const sinon = require('sinon');
const requiredStackTagsPolicy = require('./required-stack-tags');

describe('requiredStackTagsPolicy', () => {
  let policy;
  let declaration;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
    declaration = { provider: {} };
  });

  it('passes if specified tags are present', () => {
    declaration.provider.stackTags = { foo: 'bar', floo: 'baz' };
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids if specified tags are missing', () => {
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' });
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Required stack tag foo not set')).to.be.true;
  });

  it('forbids if specified tag doesnt match RegExp', () => {
    declaration.provider.stackTags = { foo: 'baz' };
    requiredStackTagsPolicy(policy, { declaration }, { foo: 'bar' });
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Required stack tag foo value baz does not match RegExp: bar')).to
      .be.true;
  });
});
