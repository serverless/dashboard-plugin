module.exports = function allowedRuntimesPolicy(policy, service, allowedRuntimes) {
  let failed = false
  for (const fnName in service.declaration.functions || {}) {
    if (
      !allowedRuntimes.includes(
        service.declaration.functions[fnName].runtime || service.declaration.provider.runtime
      )
    ) {
      failed = true
      policy.fail(
        `Runtime of function ${fnName} not in list of permitted runtimes: ${JSON.stringify(
          allowedRuntimes
        )}`
      )
    }
  }
  if (!failed) {
    policy.approve()
  }
}

module.exports.docs =
  'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#allowed-runtimes'
