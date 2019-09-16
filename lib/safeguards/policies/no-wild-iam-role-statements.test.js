'use strict';

const sinon = require('sinon');
const noWildIamPolicy = require('./no-wild-iam-role-statements');

describe('noWildIamPolicy', () => {
  let policy;
  let compiled;

  beforeEach(() => {
    policy = { approve: sinon.stub(), fail: sinon.stub() };
    compiled = { 'cloudformation-template-update-stack.json': { Resources: {} } };
  });

  it('allows allows explicit policies', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: ['foobar'],
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows allows policies with Ref', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: [{ Ref: 'foobar' }],
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows allows policies with resources that isnt array', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: { Ref: 'foobar' },
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('blocks string literal service:* actions', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:*'],
                  Resource: ['foobar'],
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        "iamRoleStatement granting Action='s3:*'. Wildcard actions in iamRoleStatements are not permitted."
      )
    ).to.be.true;
  });

  it('blocks string literal * actions', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['*'],
                  Resource: ['foobar'],
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        "iamRoleStatement granting Action='*'. Wildcard actions in iamRoleStatements are not permitted."
      )
    ).to.be.true;
  });

  it('blocks string literal * resources', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: ['*'],
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        "iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
      )
    ).to.be.true;
  });

  it('blocks string Fn::Join created * resources', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: [{ 'Fn::Join': ['', ['*']] }],
                },
              ],
            },
          },
        ],
      },
    };
    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        "iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
      )
    ).to.be.true;
  });

  it('blocks string Fn::Sub created * resources', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: [{ 'Fn::Sub': ['*'] }],
                },
              ],
            },
          },
        ],
      },
    };

    noWildIamPolicy(policy, { compiled });
    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        "iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
      )
    ).to.be.true;
  });
});
