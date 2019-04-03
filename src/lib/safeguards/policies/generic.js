const jsonata = require('jsonata')

module.exports = function genericPolicy(policy, service, options) {
  const passed = options.every((query) => {
    const expression = jsonata(query)
    let value

    try {
      value = expression.evaluate(service)
    } catch (ex) {
      policy.fail(`Unable to parse query ("${query}"): ${ex}`)
      return
    }
    return typeof value != 'undefined' && value != null
  })

  if (passed) {
    policy.approve()
  } else {
    policy.fail('Configuration must comply with all of the configured queries.')
  }
}

module.exports.docs = 'https://git.io/fjI97'
