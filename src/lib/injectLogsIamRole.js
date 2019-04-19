import { getAccessKeyForTenant, getMetadata } from '@serverless/platform-sdk'

export default async function(ctx) {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant)

  const { awsAccountId } = await getMetadata(accessKey)
  ctx.sls.service.provider.compiledCloudFormationTemplate.Resources.EnterpriseLogAccessIamRole = {
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${awsAccountId}:root`
            },
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: {
                'sts:ExternalId': `ServerlessEnterprise-${ctx.sls.service.tenantUid}`
              }
            }
          }
        ]
      },
      Policies: [
        {
          PolicyName: 'LogFilterAccess',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['logs:FilterLogEvents'],
                Resource: Object.entries(
                  ctx.sls.service.provider.compiledCloudFormationTemplate.Resources
                )
                  .filter(([, { Type }]) => Type === 'AWS::Logs::LogGroup')
                  .map(([logicalId]) => ({
                    'Fn::Sub': `arn:aws:logs:$\{AWS::Region}:$\{AWS::AccountId}:log-group:$\{${logicalId}}`
                  }))
              }
            ]
          }
        }
      ]
    }
  }
  ctx.sls.service.provider.compiledCloudFormationTemplate.Outputs.EnterpriseLogAccessIamRole = {
    Value: {
      'Fn::GetAtt': ['EnterpriseLogAccessIamRole', 'Arn']
    }
  }
}
