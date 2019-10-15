'use strict';

const allowedIntegrationTypes = ['lambda-proxy', 'aws-proxy', 'aws_proxy'];

module.exports = function allowedRuntimesPolicy(policy, service) {
  let failed = false;
  for (const fnName of Object.keys(service.declaration.functions)) {
    for (const eventTrigger of service.declaration.functions[fnName].events || []) {
      if (
        eventTrigger.http &&
        !allowedIntegrationTypes.includes(eventTrigger.http.integration || 'lambda-proxy')
      ) {
        failed = true;
        policy.fail(
          `Function "${fnName}" is using HTTP integration "${eventTrigger.http.integration}" which does not support instrumentation by the Serverless Dashboard`
        );
      }
    }
  }
  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-forbid-lambda-apig-integration';
