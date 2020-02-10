'use strict';

const process = require('process');

module.exports = function myCustomPolicy(policy, service, requiredEnvVars) {
  let failed = false;

  for (const key of Object.keys(requiredEnvVars)) {
    if (!(key in process.env)) {
      failed = true;
      policy.fail(`Required env var ${key} not set`);
    } else if (!process.env[key].match(requiredEnvVars[key])) {
      failed = true;
      policy.fail(
        `Required env var ${key} value ${process.env[key]} does not match RegExp: ${requiredEnvVars[key]}`
      );
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-required-env-vars';
