'use strict';

const sinon = require('sinon');
const requireCfnRolePolicy = require('./require-cfn-role');

describe('requireCfnRolePolicy', () => {
  let policy;
  let declaration;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
    declaration = { provider: {} };
  });

  it('passes if cfnRole is set', () => {
    declaration.provider.cfnRole = 'arn:aws:blablabla';
    requireCfnRolePolicy(policy, { declaration });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids if cfnRole is not set', () => {
    requireCfnRolePolicy(policy, { declaration });
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('no cfnRole set')).to.be.true;
  });
});
