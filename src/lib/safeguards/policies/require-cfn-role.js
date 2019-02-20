module.exports = function requireCfnRolePolicy(policy, service) {
  if (!service.declaration.provider.cfnRole) {
    throw new policy.Failure('no cfnRole set')
  }
  policy.approve()
}
