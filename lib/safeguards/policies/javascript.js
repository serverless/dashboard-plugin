'use strict';

const jsonataQuery = require('jsonata');
const vm = require('vm');

const execStatement = (service, statement) => {
  const jsonata = (queryStatement) => {
    const expression = jsonataQuery(queryStatement);
    const value = expression.evaluate(service);
    if (Array.isArray(value)) {
      return value.length > 0;
    } else if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return Boolean(value);
  };

  const sandbox = {
    jsonata,
    ...service,
  };

  vm.createContext(sandbox);

  return vm.runInContext(statement, sandbox);
};

module.exports = function javascriptPolicy(policy, service, options) {
  const statement = JSON.parse(options);
  let response;
  try {
    response = execStatement(service, statement);
  } catch (ex) {
    policy.fail(`Error in the policy statement: "${statement}"`);
    return;
  }
  if (!response) {
    policy.fail('Must comply with all of the configured queries.');
    return;
  }
  policy.approve();
};

module.exports.docs = 'http://slss.io/sg-custom-policy';
