'use strict';

const sinon = require('sinon');
const frameworkVersionPolicy = require('./framework-version');

describe('frameworkVersionPolicy', () => {
  let policy;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
  });

  it('passes if version is the same', () => {
    frameworkVersionPolicy(policy, { frameworkVersion: '1.37.1' }, '1.37.1');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('passes if version satisfies range', () => {
    frameworkVersionPolicy(policy, { frameworkVersion: '1.37.1' }, '>1.37.0 <2.0.0');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('passes if version satisfies caret range', () => {
    frameworkVersionPolicy(policy, { frameworkVersion: '1.37.1' }, '^1.37.0');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids if exact version does not match', () => {
    frameworkVersionPolicy(policy, { frameworkVersion: '1.37.1' }, '1.37.0');
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        'Serverless Framework version 1.37.1 does not satisfy version requirement: 1.37.0'
      )
    ).to.be.true;
  });

  it('forbids if version range does not match', () => {
    frameworkVersionPolicy(policy, { frameworkVersion: '1.37.1' }, '<1.37.1');
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        'Serverless Framework version 1.37.1 does not satisfy version requirement: <1.37.1'
      )
    ).to.be.true;
  });
});
