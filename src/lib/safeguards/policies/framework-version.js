const semver = require('semver')

module.exports = function frameworkVersionPolicy(policy, service, versionRange) {
  if (!semver.satisfies(service.frameworkVerison, versionRange)) {
    throw new policy.Failure(
      `Serverless Framework version ${
        service.frameworkVerison
      } does not satisfy version requirement: ${versionRange}`
    )
  }
  policy.approve()
}
