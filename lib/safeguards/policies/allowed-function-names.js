'use strict';

const vm = require('vm');
const { entries, fromPairs } = require('lodash');

/*
 * Converts a string that looks like a tagged template literal into a RegExp.
 * Uses the vm module to safely eval the string as a tagged template literal.
 * The context parameter is the only thing the evaluated string is given access to.
 */
const templateStringToRegExp = (pattern, context) =>
  vm.runInNewContext(`new RegExp(\`^${pattern}$\`)`, context);

module.exports = function allowedFunctionNamesPolicy(policy, service, options) {
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
    const templateContext = {
      SERVICE: service.declaration.serviceObject.name,
      STAGE: service.provider.getStage(),
      FUNCTION: logicalFuncNamesToConfigFuncName[funcName] || '',
    };
    const regexp = templateStringToRegExp(options, templateContext);
    if (!Properties.FunctionName.match(regexp)) {
      failed = true;
      policy.fail(
        `Function "${
          logicalFuncNamesToConfigFuncName[funcName] || funcName
        }" doesn't match RegExp ${regexp}.`
      );
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-allowed-function-names';
