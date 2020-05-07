'use strict';

const { entries, fromPairs } = require('lodash');

module.exports = function requireDescriptionPolicy(policy, service, options) {
  let failed = false;
  const {
    declaration: { functions },
    provider: { naming },
    compiled: {
      'cloudformation-template-update-stack.json': { Resources },
    },
  } = service;
  const logicalFuncNamesToConfigFuncName = fromPairs(
    Object.keys(functions || {}).map((funcName) => [naming.getLambdaLogicalId(funcName), funcName])
  );

  for (const [funcName, { Properties, Type }] of entries(Resources)) {
    if (Type !== 'AWS::Lambda::Function') {
      continue;
    }
    if (!Properties.Description) {
      failed = true;
      policy.fail(
        `Function "${logicalFuncNamesToConfigFuncName[funcName] || funcName}" has no description`
      );
    } else {
      if (Properties.Description.length > ((options && options.maxLength) || 256)) {
        failed = true;
        policy.fail(
          `Description for function "${
            logicalFuncNamesToConfigFuncName[funcName] || funcName
          }" is too long`
        );
      }
      if (Properties.Description.length < ((options && options.minLength) || 30)) {
        failed = true;
        policy.fail(
          `Description for function "${
            logicalFuncNamesToConfigFuncName[funcName] || funcName
          }" is too short`
        );
      }
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-require-desc';
