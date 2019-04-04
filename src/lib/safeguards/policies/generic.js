const jsonata = require('jsonata')
const vm = require('vm')

const execStatement = (service, statement) => {
  const query = (queryStatement) => {
    const expression = jsonata(queryStatement)
    const value = expression.evaluate(service)
    return typeof value != 'undefined' && value != null
  }

  const sandbox = {
    query: query,
    service: service
  }

  vm.createContext(sandbox)

  return vm.runInContext(statement, sandbox)
}

module.exports = function genericPolicy(policy, service, options) {
  for (const statement of options) {
    let response
    try {
      response = execStatement(service, statement)
    } catch (ex) {
      policy.fail(`Error in the policy statement: "${statement}"`)
      return
    }
    if (!response) {
      policy.fail('Must comply with all of the configured queries.')
      return
    }
  }
  policy.approve()
}

module.exports.docs = 'https://git.io/fjI97'
