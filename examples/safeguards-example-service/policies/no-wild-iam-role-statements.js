module.exports = function noWildIamPolicy(policy, service) {
  const {
    compiled: {
      'cloudformation-template-update-stack.json': { Resources }
    }
  } = service

  for (const { Type, Properties } of Object.values(Resources)) {
    if (Type !== 'AWS::IAM::Role') continue

    for (const iamPolicy of Properties.Policies) {
      for (const { Effect, Action, Resource } of iamPolicy.PolicyDocument.Statement) {
        if (Effect === 'Deny') continue

        for (const action of Action) {
          if (action === '*')
            throw new policy.Failure(
              `iamRoleStatement granting Action='*'. Wildcard actions in iamRoleStatements are not permitted.`
            )
          if (action.split(':')[1] === '*')
            throw new policy.Failure(
              `iamRoleStatement granting Action='${action}'. Wildcard actions in iamRoleStatements are not permitted.`
            )
        }
        for (const rawResource of Resource) {
          let resourceStr = rawResource
          if (typeof rawResource === 'object') {
            if ('Fn::Join' in rawResource) {
              resourceStr = rawResource['Fn::Join'][1].join(rawResource['Fn::Join'][0])
            } else if ('Fn::Sub' in rawResource) {
              if (typeof rawResource['Fn::Sub'] == 'string') {
                resourceStr = rawResource['Fn::Sub'].replace(/\$\{[^$]*\}/g, 'variable')
              } else {
                resourceStr = rawResource['Fn::Sub'][0].replace(/\$\{[^$]*\}/g, 'variable')
              }
            }
          }
          if (resourceStr === '*')
            throw new policy.Failure(
              `iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted.`
            )
          const [
            arn,
            partition,
            service,
            region,
            accountId,
            resourceType,
            resource,
            qualifier
          ] = resourceStr.split(':')
          if (service === '*' || resourceType === '*' || resource === '*')
            throw new policy.Failure(
              `iamRoleStatement granting Resource=${JSON.stringify(
                rawResource
              )}. Wildcard resources or resourcetypes in iamRoleStatements are not permitted.`
            )
        }
      }
    }
  }

  policy.approve()
}
