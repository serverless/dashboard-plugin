'use strict';

const sinon = require('sinon');
const requireDescriptionPolicy = require('./require-description');

describe('requireDescriptionPolicy', () => {
  let policy;
  let service;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
    service = {
      compiled: { 'cloudformation-template-update-stack.json': { Resources: {} } },
      declaration: {
        functions: {
          func: {},
        },
      },
      provider: { naming: { getLambdaLogicalId: (fnName) => `${fnName}Lambda` } },
    };
  });

  it('allows functions with a valid description with no options', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: { Description: '1'.repeat(35) },
    };
    requireDescriptionPolicy(policy, service);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows functions with a valid description with custom maxLength', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: { Description: '1'.repeat(35) },
    };
    requireDescriptionPolicy(policy, service, { maxLength: 40 });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows functions with a valid description with custom minLength', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: { Description: '1'.repeat(5) },
    };
    requireDescriptionPolicy(policy, service, { minLength: 4 });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows functions with a valid description with custom minLength&maxLength', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: { Description: '1'.repeat(5) },
    };
    requireDescriptionPolicy(policy, service, { minLength: 4, maxLength: 6 });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('blocks functions with out a Description', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: {},
    };
    requireDescriptionPolicy(policy, service);

    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Function "func" has no description')).to.be.true;
  });

  it('blocks functions with too short a description with no options', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { Description: '1'.repeat(1) },
    };
    requireDescriptionPolicy(policy, service);

    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Description for function "func" is too short')).to.be.true;
  });

  it('blocks functions with too long a description with no options', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { Description: '1'.repeat(300) },
    };
    requireDescriptionPolicy(policy, service);

    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Description for function "func" is too long')).to.be.true;
  });

  it('blocks functions with too short a description with custom options', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { Description: '1'.repeat(1) },
    };
    requireDescriptionPolicy(policy, service, { minLength: 5 });

    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Description for function "func" is too short')).to.be.true;
  });

  it('blocks functions with too long a description with custom options', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { Description: '1'.repeat(51) },
    };
    requireDescriptionPolicy(policy, service, { maxLength: 50 });

    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Description for function "func" is too long')).to.be.true;
  });
});
