module.exports = function requiredStackTagsPolicy(policy, service, requiredStackTags) {
  const stackTags = service.declaration.provider.stackTags || {}
  for (const key in requiredStackTags) {
    if (!(key in stackTags)) {
      throw new policy.Failure(`Required stack tag ${key} not set`)
    }
    if (!stackTags[key].match(requiredStackTags[key])) {
      throw new policy.Failure(
        `Required stack tag ${key} value ${stackTags[key]} does not match RegExp: ${
          requiredStackTags[key]
        }`
      )
    }
  }
  policy.approve()
}

module.exports.docs = 'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#required-stack-tags'
