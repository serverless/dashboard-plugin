'use strict';

const { entries } = require('lodash');

module.exports = function forbidS3HttpAccessPolicy(policy, service) {
  let failed = false;
  const {
    compiled: {
      'cloudformation-template-update-stack.json': { Resources },
    },
  } = service;

  const buckets = new Map(entries(Resources).filter(([, { Type }]) => Type === 'AWS::S3::Bucket'));
  const bucketPolicies = new Map(
    entries(Resources).filter(([, { Type }]) => Type === 'AWS::S3::BucketPolicy')
  );
  for (const [bucketName, bucket] of buckets) {
    let foundMatchingPolicy = false;
    for (const [, bucketPolicy] of bucketPolicies) {
      if (
        bucketPolicy.Properties &&
        (bucketPolicy.Properties.Bucket && bucketPolicy.Properties.Bucket.Ref
          ? bucketPolicy.Properties.Bucket.Ref === bucketName
          : bucketPolicy.Properties.Bucket === bucket.Properties.Name) &&
        bucketPolicy.PolicyDocument &&
        bucketPolicy.PolicyDocument.Statement.length &&
        bucketPolicy.PolicyDocument.Statement[0].Action === 's3:*' &&
        bucketPolicy.PolicyDocument.Statement[0].Effect === 'Deny' &&
        bucketPolicy.PolicyDocument.Statement[0].Principal === '*' &&
        (bucketPolicy.PolicyDocument.Statement[0].Resource &&
        bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join']
          ? bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join'].length === 2 &&
            bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join'][0] === '' &&
            bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join'][1].length === 3 &&
            bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join'][1][0] ===
              'arn:aws:s3:::' &&
            bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join'][1][1].Ref ===
              bucketName &&
            bucketPolicy.PolicyDocument.Statement[0].Resource['Fn::Join'][1][2] === '/*'
          : bucketPolicy.PolicyDocument.Statement[0].Resource ===
            `arn:aws:s3:::${bucket.Properties.Name}/*`) &&
        bucketPolicy.PolicyDocument.Statement[0].Condition &&
        bucketPolicy.PolicyDocument.Statement[0].Condition.Bool &&
        bucketPolicy.PolicyDocument.Statement[0].Condition.Bool['aws:SecureTransport'] === false &&
        true
      ) {
        foundMatchingPolicy = true;
      }
    }
    if (!foundMatchingPolicy) {
      failed = true;
      policy.fail(
        `Bucket "${bucketName}" doesn't have a BucketPolicy forbidding unsecure HTTP access.`
      );
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-forbid-s3-http-access';
