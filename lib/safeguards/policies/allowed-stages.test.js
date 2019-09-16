'use strict';

const sinon = require('sinon');
const allowedStagePolicy = require('./allowed-stages');

describe('allowedStagePolicy', () => {
  let policy;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
  });

  it('allows dev with options ["dev"]', () => {
    const getStage = sinon.stub().returns('dev');
    allowedStagePolicy(policy, { provider: { getStage } }, ['dev']);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows dev with options ["prod", "dev"]', () => {
    const getStage = sinon.stub().returns('dev');
    allowedStagePolicy(policy, { provider: { getStage } }, ['prod', 'dev']);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids dev with options ["prod"]', () => {
    const getStage = sinon.stub().returns('dev');

    allowedStagePolicy(policy, { provider: { getStage } }, ['prod']);
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Stage name "dev" not in list of permitted names: ["prod"]')).to
      .be.true;
  });

  it('allows dev with options "(dev|prod)"', () => {
    const getStage = sinon.stub().returns('dev');
    allowedStagePolicy(policy, { provider: { getStage } }, '(dev|prod)');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids dev with options "(prod|stg)"', () => {
    const getStage = sinon.stub().returns('dev');

    allowedStagePolicy(policy, { provider: { getStage } }, '(prod|stg)');
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Stage name "dev" not permitted by RegExp: "(prod|stg)"')).to.be
      .true;
  });
});
