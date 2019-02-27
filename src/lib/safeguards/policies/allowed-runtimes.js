module.exports = function allowedRuntimesPolicy(policy, service, allowedRuntimes) {
  for (const fnName in service.declaration.functions || {}) {
    if (
      !allowedRuntimes.includes(
        service.declaration.functions[fnName].runtime || service.declaration.provider.runtime
      )
    ) {
      throw new policy.Failure(
        `Runtime of function ${fnName} not in list of permitted runtimes: ${JSON.stringify(
          allowedRuntimes
        )}`
      )
    }
  }
  policy.approve()
}

module.exports.docs = 'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#allowed-runtimes'
