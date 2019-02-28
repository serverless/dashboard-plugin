module.exports = function allowedRegionsPolicy(policy, service, options) {
  const region = service.provider.getRegion()
  if (!options.includes(region)) {
    throw new policy.Failure(
      `Region "${region}" not in list of permitted regions: ${JSON.stringify(options)}`
    )
  }
  policy.approve()
}

module.exports.docs =
  'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#allowed-regions'
