'use strict';

const sinon = require('sinon');
const forbidS3HttpAccessPolicy = require('./forbid-s3-http-access');

describe('forbidS3HttpAccessPolicy', () => {
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

  it('allows buckets with a correct policy using refs', () => {
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucket = {
      Type: 'AWS::S3::Bucket',
      Properties: {},
    };
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucketPolicy = {
      Type: 'AWS::S3::BucketPolicy',
      Properties: {
        Bucket: { Ref: 'ServerlessDeploymentBucket' },
      },
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:*',
            Effect: 'Deny',
            Principal: '*',
            Resource: {
              'Fn::Join': ['', ['arn:aws:s3:::', { Ref: 'ServerlessDeploymentBucket' }, '/*']],
            },
            Condition: {
              Bool: {
                'aws:SecureTransport': false,
              },
            },
          },
        ],
      },
    };
    forbidS3HttpAccessPolicy(policy, service);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows buckets with a correct policy using refs and names', () => {
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucket = {
      Type: 'AWS::S3::Bucket',
      Properties: { Name: 'foobar' },
    };
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucketPolicy = {
      Type: 'AWS::S3::BucketPolicy',
      Properties: {
        Bucket: { Ref: 'ServerlessDeploymentBucket' },
      },
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:*',
            Effect: 'Deny',
            Principal: '*',
            Resource: 'arn:aws:s3:::foobar/*',
            Condition: {
              Bool: {
                'aws:SecureTransport': false,
              },
            },
          },
        ],
      },
    };
    forbidS3HttpAccessPolicy(policy, service);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('allows buckets with a correct policy using explicit name', () => {
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucket = {
      Type: 'AWS::S3::Bucket',
      Properties: { Name: 'foobar' },
    };
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucketPolicy = {
      Type: 'AWS::S3::BucketPolicy',
      Properties: {
        Bucket: 'foobar',
      },
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:*',
            Effect: 'Deny',
            Principal: '*',
            Resource: 'arn:aws:s3:::foobar/*',
            Condition: {
              Bool: {
                'aws:SecureTransport': false,
              },
            },
          },
        ],
      },
    };
    forbidS3HttpAccessPolicy(policy, service);
    expect(policy.approve.callCount).to.equal(1);
    expect(policy.fail.callCount).to.equal(0);
  });

  it('blocks buckets with out a bucket policy', () => {
    service.compiled[
      'cloudformation-template-update-stack.json'
    ].Resources.ServerlessDeploymentBucket = {
      Type: 'AWS::S3::Bucket',
      Properties: {},
    };
    forbidS3HttpAccessPolicy(policy, service);

    expect(policy.approve.callCount).to.equal(0);
    expect(
      policy.fail.calledWith(
        'Bucket "ServerlessDeploymentBucket" doesn\'t have a BucketPolicy forbidding unsecure HTTP access.'
      )
    ).to.be.true;
  });
});
