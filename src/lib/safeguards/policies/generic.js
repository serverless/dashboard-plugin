const jsonata = require('jsonata')

module.exports = function genericPolicy(policy, service, options) {
  let expression, value
  const passed = options.every((query) => {
    try {
      expression = jsonata(query)
    } catch (ex) {
      policy.fail(`Configuration setting is invalid: "${query}"`)
      return
    }

    value = expression.evaluate(service)
    return typeof value != 'undefined' && value != null
  })

  if (passed) {
    policy.approve()
  } else {
    policy.fail('Must comply with all of the configured queries.')
  }
}

module.exports.docs = 'https://git.io/fjI97'
