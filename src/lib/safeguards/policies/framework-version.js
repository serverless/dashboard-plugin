const semver = require('semver')

module.exports = function frameworkVersionPolicy(policy, service, versionRange) {
  if (!semver.satisfies(service.frameworkVersion, versionRange)) {
    throw new policy.Failure(
      `Serverless Framework version ${
        service.frameworkVersion
      } does not satisfy version requirement: ${versionRange}`
    )
  }
  policy.approve()
}

module.exports.docs = 'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#tbd'
