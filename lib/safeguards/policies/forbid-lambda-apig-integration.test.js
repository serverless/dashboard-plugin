'use strict';

const sinon = require('sinon');
const forbidLambdaApigIntegration = require('./forbid-lambda-apig-integration');

describe('fobidLambdaIntegrationPolicy', () => {
  let policy;
  let declaration;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
    declaration = { provider: {}, functions: { func: {} } };
  });

  it('allows default integration (lambda-proxy)', () => {
    declaration.functions.func.events = [{ http: {} }];
    forbidLambdaApigIntegration(policy, { declaration });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows integration=lambda-proxy', () => {
    declaration.functions.func.events = [
      {
        http: { integration: 'lambda-proxy' },
      },
    ];
    forbidLambdaApigIntegration(policy, { declaration });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('forbids integration=lambda', () => {
    declaration.functions.func.events = [
      {
        http: { integration: 'lambda' },
      },
    ];
    forbidLambdaApigIntegration(policy, { declaration });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        'Function "func" is using HTTP integration "lambda" which does not support instrumentation by the Serverless Dashboard'
      )
    ).to.be.true;
  });
});
