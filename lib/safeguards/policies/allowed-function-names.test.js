'use strict';

const sinon = require('sinon');
const allowedFunctionNamesPolicy = require('./allowed-function-names');

describe('allowedFunctionNamesPolicy', () => {
  let policy;
  let service;

  beforeEach(() => {
    policy = { approve: sinon.spy(), fail: sinon.spy() };
    service = {
      compiled: { 'cloudformation-template-update-stack.json': { Resources: {} } },
      declaration: {
        serviceObject: { name: 'serviceName' },
        functions: { func: {} },
      },
      provider: {
        naming: { getLambdaLogicalId: (fnName) => `${fnName}Lambda` },
        getStage: () => 'stage',
      },
    };
  });

  it('allows functions with a valid name', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        FunctionName: 'serviceName-stage-func',
      },
    };
    allowedFunctionNamesPolicy(policy, service, '${SERVICE}-${STAGE}-${FUNCTION}');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('blocks functions with an invalid name', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: {
        FunctionName: 'func',
      },
    };
    allowedFunctionNamesPolicy(policy, service, '${SERVICE}-${STAGE}-${FUNCTION}');

    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith('Function "func" doesn\'t match RegExp /^serviceName-stage-func$/.')
    ).to.be.true;
  });

  it('blocks functions with an invalid name bc it matches the whole func name', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: {
        FunctionName: 'serviceName-stage-funcsafasfdsf',
      },
    };
    allowedFunctionNamesPolicy(policy, service, '${SERVICE}-${STAGE}-${FUNCTION}');

    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith('Function "func" doesn\'t match RegExp /^serviceName-stage-func$/.')
    ).to.be.true;
  });

  it('allows functions with a valid name bc it adds .* at the end', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        FunctionName: 'serviceName-stage-funcsafasfdsf',
      },
    };
    allowedFunctionNamesPolicy(policy, service, '${SERVICE}-${STAGE}-${FUNCTION}.*');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows functions with a valid name ignoring func name', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        FunctionName: 'serviceName-stage-asfdasfsafkjahdguosndfl',
      },
    };
    allowedFunctionNamesPolicy(policy, service, '${SERVICE}-${STAGE}-.+');
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });
});
