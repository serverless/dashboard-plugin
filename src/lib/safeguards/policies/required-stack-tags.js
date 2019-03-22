module.exports = function requiredStackTagsPolicy(policy, service, requiredStackTags) {
  let failed = false
  const stackTags = service.declaration.provider.stackTags || {}
  for (const key in requiredStackTags) {
    if (!(key in stackTags)) {
      failed = true
      policy.fail(`Required stack tag ${key} not set`)
    } else if (!stackTags[key].match(requiredStackTags[key])) {
      failed = true
      policy.fail(
        `Required stack tag ${key} value ${stackTags[key]} does not match RegExp: ${
          requiredStackTags[key]
        }`
      )
    }
  }
  if (!failed) {
    policy.approve()
  }
}

module.exports.docs = 'https://git.io/fhpFc'
