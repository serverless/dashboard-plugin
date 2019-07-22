'use strict';

module.exports = function allowedStagePolicy(policy, service, options) {
  const stageName = service.provider.getStage();
  if (typeof options === 'string') {
    if (!stageName.match(options)) {
      policy.fail(`Stage name "${stageName}" not permitted by RegExp: "${options}"`);
    } else {
      policy.approve();
    }
  } else {
    for (const i of Object.keys(options)) {
      if (options[i] === stageName) {
        policy.approve();
        return;
      }
    }
    policy.fail(
      `Stage name "${stageName}" not in list of permitted names: ${JSON.stringify(options)}`
    );
  }
};

module.exports.docs = 'http://slss.io/sg-allowed-stages';
