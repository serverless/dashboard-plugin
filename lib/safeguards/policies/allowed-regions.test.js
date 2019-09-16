'use strict';

const sinon = require('sinon');
const allowedRegionsPolicy = require('./allowed-regions');

describe('allowedRegionsPolicy', () => {
  let policy;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
  });

  it('allows us-east-1 with options ["us-east-1"]', () => {
    const getRegion = sinon.stub().returns('us-east-1');
    allowedRegionsPolicy(policy, { provider: { getRegion } }, ['us-east-1']);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows us-east-1 with options ["us-east-1", "us-east-2"]', () => {
    const getRegion = sinon.stub().returns('us-east-1');
    allowedRegionsPolicy(policy, { provider: { getRegion } }, ['us-east-1', 'us-east-2']);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids us-east-1 with options ["us-east-2"]', () => {
    const getRegion = sinon.stub().returns('us-east-1');

    allowedRegionsPolicy(policy, { provider: { getRegion } }, ['us-east-2']);
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith('Region "us-east-1" not in list of permitted regions: ["us-east-2"]')
    ).to.be.true;
  });
});
