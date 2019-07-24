'use strict';

const semver = require('semver');

module.exports = function frameworkVersionPolicy(policy, service, versionRange) {
  if (!semver.satisfies(service.frameworkVersion, versionRange)) {
    policy.fail(
      `Serverless Framework version ${service.frameworkVersion} does not satisfy version requirement: ${versionRange}`
    );
  } else {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-framework-version';
