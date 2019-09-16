'use strict';

const sinon = require('sinon');
const restrictedDeployTimesPolicy = require('./restricted-deploy-times');

describe('restrictedDeployTimesPolicy', () => {
  const dateDotNow = Date.now;
  let policy;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
  });

  afterEach(() => {
    Date.now = dateDotNow;
  });

  it('allow deployment if no restrictions', () => {
    restrictedDeployTimesPolicy(policy, {});
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allow blocks deployment on Friday when Friday is blocked', () => {
    Date.now = sinon.stub().returns(new Date('2019-03-08T01:00:00').getTime());
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-03-01', interval: 'P1W', duration: 'P1D' }
    );
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Deploying on 2019-03-08 is not allowed')).to.be.true;
  });

  it('allow deployment on Monday when Friday is blocked', () => {
    Date.now = sinon.stub().returns(new Date('2019-03-04T01:00:00').getTime());
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-03-01', interval: 'P1W', duration: 'P1D' }
    );
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('blocks deployment on Rosh Hashanah when it is blocked', () => {
    Date.now = sinon.stub().returns(new Date('2019-10-01T07:00:00').getTime());
    restrictedDeployTimesPolicy(policy, {}, { time: '2019-09-29T19:00:00', duration: 'P2D2H' });
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Deploying on 2019-10-01 is not allowed')).to.be.true;
  });

  it('blocks deployment on Christmas when it is blocked', () => {
    Date.now = sinon.stub().returns(new Date('2019-12-25T01:00:00').getTime());
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-12-25', duration: 'P1D', interval: 'P1Y' }
    );
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Deploying on 2019-12-25 is not allowed')).to.be.true;
  });

  it('blocks deployment on next Christmas when it is blocked', () => {
    Date.now = sinon.stub().returns(new Date('2020-12-25T01:00:00').getTime());
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-12-25', duration: 'P1D', interval: 'P1Y' }
    );
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Deploying on 2020-12-25 is not allowed')).to.be.true;
  });
});
