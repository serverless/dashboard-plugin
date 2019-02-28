module.exports = function allowedStagePolicy(policy, service, options) {
  const stageName = service.provider.getStage()
  if (typeof options === 'string') {
    if (!stageName.match(options)) {
      policy.fail(`Stage name "${stageName}" not permitted by RegExp: "${options}"`)
    } else {
      policy.approve()
    }
  } else {
    for (const i in options) {
      if (options[i] === stageName) {
        policy.approve()
        return
      }
    }
    policy.fail(
      `Stage name "${stageName}" not in list of permitted names: ${JSON.stringify(options)}`
    )
  }
}

module.exports.docs =
  'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#allowed-stages'
