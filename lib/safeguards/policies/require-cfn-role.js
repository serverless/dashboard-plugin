'use strict';

module.exports = function requireCfnRolePolicy(policy, service) {
  if (!service.declaration.provider.cfnRole) {
    policy.fail('no cfnRole set');
  } else {
    policy.approve();
  }
};

module.exports.docs = 'https://serverless.com/framework/docs/dashboard/safeguards/available/#require-cloudformation-deployment-role';
