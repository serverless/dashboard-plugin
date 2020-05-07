'use strict';

const { entries, fromPairs } = require('lodash');

const asyncEvents = new Set([
  's3',
  'sns',
  'alexaSkill',
  'iot',
  'cloudwatchEvent',
  'cloudwatchLog',
  'cognitoUserPool',
  'alexaSmartHome',
]);
module.exports = function dlqPolicy(policy, service) {
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

  const customResourceFuncIdentifier = 'custom-resource-';

  // for (const [name, { events, onError }] of entries(functions)) {
  for (const [funcName, { Properties, Type }] of entries(Resources)) {
    if (
      Type !== 'AWS::Lambda::Function' ||
      (Properties.DeadLetterConfig && Properties.DeadLetterConfig.TargetArn)
    ) {
      continue;
    }

    // ignore functions injected for custom resources by SFO
    if (Properties.FunctionName.includes(customResourceFuncIdentifier)) continue;

    const events = (functions[logicalFuncNamesToConfigFuncName[funcName]] || {}).events || [];
    const eventTypes = new Set(events.map((ev) => Object.keys(ev)[0]));
    const eventIntersection = new Set([...asyncEvents].filter((x) => eventTypes.has(x)));
    if (events.length === 0 || eventIntersection.size > 0) {
      failed = true;
      policy.fail(
        `Function "${
          logicalFuncNamesToConfigFuncName[funcName] || funcName
        }" doesn't have a Dead Letter Queue configured.`
      );
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-require-dlq';
