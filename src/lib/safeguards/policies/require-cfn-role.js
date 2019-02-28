module.exports = function requireCfnRolePolicy(policy, service) {
  if (!service.declaration.provider.cfnRole) {
    policy.fail('no cfnRole set')
  } else {
    policy.approve()
  }
}

module.exports.docs =
  'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#require-cloudformation-deployment-role'
