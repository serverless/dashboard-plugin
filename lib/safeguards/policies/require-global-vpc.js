'use strict';

const { entries, fromPairs } = require('lodash');

module.exports = function requireGlobalVpcPolicy(
  policy,
  service,
  { minNumSubnets } = { minNumSubnets: 2 }
) {
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

  for (const [
    funcName,
    {
      Properties: { VpcConfig },
      Type,
    },
  ] of entries(Resources)) {
    if (Type !== 'AWS::Lambda::Function') {
      continue;
    }
    if (!VpcConfig || !VpcConfig.SecurityGroupIds || !VpcConfig.SubnetIds) {
      failed = true;
      policy.fail(
        `Function "${
          logicalFuncNamesToConfigFuncName[funcName] || funcName
        }" doesn't satisfy global VPC requirement.`
      );
    } else if (VpcConfig.SubnetIds.length < minNumSubnets) {
      failed = true;
      policy.fail(
        `Function "${
          logicalFuncNamesToConfigFuncName[funcName] || funcName
        }" doesn't satisfy the global VPC requirement of at least ${minNumSubnets} subnets.`
      );
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-require-global-vpc';
