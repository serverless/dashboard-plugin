module.exports = function noWildIamPolicy(policy, service) {
  const {
    compiled: {
      'cloudformation-template-update-stack.json': { Resources }
    }
  } = service

  for (const { Type, Properties } of Object.values(Resources)) {
    if (Type !== 'AWS::IAM::Role') {
      continue
    }

    for (const iamPolicy of Properties.Policies) {
      for (const { Effect, Action, Resource } of iamPolicy.PolicyDocument.Statement) {
        if (Effect === 'Deny') {
          continue
        }

        for (const action of Action) {
          if (action === '*') {
            policy.warn(
              `iamRoleStatement granting Action='*'. Wildcard actions in iamRoleStatements are not permitted.`
            )
          }
          if (action.split(':')[1] === '*') {
            policy.warn(
              `iamRoleStatement granting Action='${action}'. Wildcard actions in iamRoleStatements are not permitted.`
            )
          }
        }
        for (const rawResource of Array.isArray(Resource) ? Resource : [Resource]) {
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
          if (resourceStr === '*') {
            policy.warn(
              `iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted.`
            )
          } else if (typeof resourceStr === 'string') {
            const [, , arnService, , , resourceType, resource] = resourceStr.split(':')
            if (arnService === '*' || resourceType === '*' || resource === '*') {
              policy.warn(
                `iamRoleStatement granting Resource=${JSON.stringify(
                  rawResource
                )}. Wildcard resources or resourcetypes in iamRoleStatements are not permitted.`
              )
            }
          } else {
            /*
             * if resourceStr isn't a string, it's probably an object
             * containing a `Ref` or CFN function like `Fn::GetAtt` which are difficult to resolve
             * cases like `Ref` are most likely safe. Explicitly bad cases using `Fn::Join` with
             * all literals, are handled above.
             */
          }
        }
      }
    }
  }

  policy.approve()
}

module.exports.docs =
  'https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#no--in-iam-role-statements'
