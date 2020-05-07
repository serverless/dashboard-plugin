'use strict';

const sinon = require('sinon');
const requireDlq = require('./require-dlq');

describe('requireDlq', () => {
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

  it('allows functions with a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        FunctionName: 'func',
        DeadLetterConfig: { TargetArn: 'arn' },
      },
    };
    requireDlq(policy, service);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows SFO custom cfn resource functions without a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        FunctionName: 'custom-resource-existing-s3',
      },
      provider: {
        naming: {
          getCustomResourceS3HandlerFunctionName: () => 'custom-resource-existing-s3',
        },
      },
    };
    requireDlq(policy, service);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('blocks functions with out a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { FunctionName: 'func' },
    };
    requireDlq(policy, service);

    expect(policy.approve.callCount).to.equal(0);
    expect(policy.fail.calledWith('Function "func" doesn\'t have a Dead Letter Queue configured.'))
      .to.be.true;
  });

  it('doesnt barf on functions not in the config & blocks', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.duncLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: { FunctionName: 'func' },
    };
    requireDlq(policy, service);

    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith('Function "duncLambda" doesn\'t have a Dead Letter Queue configured.')
    ).to.be.true;
  });
});
