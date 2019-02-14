module.exports = function allowedStagePolicy(policy, service, options) {
  const stageName = service.provider.getStage()
  if (typeof options === 'string') {
    if (!stageName.match(options)) {
      throw new policy.Failure(`Stage name "${stageName}" not permitted by RegExp: "${options}"`)
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
    throw new policy.Failure(
      `Stage name "${stageName}" not in list of permitted names: ${JSON.stringify(options)}`
    )
  }
}
