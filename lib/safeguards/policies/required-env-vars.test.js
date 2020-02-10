'use strict';

const sinon = require('sinon');
const process = require('process');
const requiredEnvVars = require('./required-env-vars');

describe('requiredEnvVars', () => {
  let policy;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
  });

  it('passes if specified tags are present', () => {
    process.env.SERVERLESS_TEST = 'true';
    requiredEnvVars(policy, {}, { SERVERLESS_TEST: 'true' });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids if specified tags are missing', () => {
    requiredEnvVars(policy, {}, { MISSING_SERVERLESS_TEST: 'true' });
    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Required env var MISSING_SERVERLESS_TEST not set')).to.be.true;
  });

  it('forbids if specified tag doesnt match RegExp', () => {
    process.env.SERVERLESS_TEST = 'baz';
    requiredEnvVars(policy, {}, { SERVERLESS_TEST: 'bar' });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        'Required env var SERVERLESS_TEST value baz does not match RegExp: bar'
      )
    ).to.be.true;
  });
});
