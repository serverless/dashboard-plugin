import noWildIamPolicy from './no-wild-iam-role-statements'

describe('noWildIamPolicy', () => {
  let policy
  let compiled

  beforeEach(() => {
    policy = { approve: jest.fn(), warn: jest.fn(), Failure: Error }
    compiled = { 'cloudformation-template-update-stack.json': { Resources: {} } }
  })

  it('allows allows explicit policies', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: ['foobar']
                }
              ]
            }
          }
        ]
      }
    }
    noWildIamPolicy(policy, { compiled })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('allows allows policies with Ref', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: [{ Ref: 'foobar' }]
                }
              ]
            }
          }
        ]
      }
    }
    noWildIamPolicy(policy, { compiled })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('allows allows policies with resources that isnt array', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: { Ref: 'foobar' }
                }
              ]
            }
          }
        ]
      }
    }
    noWildIamPolicy(policy, { compiled })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('blocks string literal service:* actions', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:*'],
                  Resource: ['foobar']
                }
              ]
            }
          }
        ]
      }
    }
    expect(() => noWildIamPolicy(policy, { compiled })).toThrow(
      "iamRoleStatement granting Action='s3:*'. Wildcard actions in iamRoleStatements are not permitted."
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('blocks string literal * actions', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['*'],
                  Resource: ['foobar']
                }
              ]
            }
          }
        ]
      }
    }
    expect(() => noWildIamPolicy(policy, { compiled })).toThrow(
      "iamRoleStatement granting Action='*'. Wildcard actions in iamRoleStatements are not permitted."
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('blocks string literal * resources', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: ['*']
                }
              ]
            }
          }
        ]
      }
    }
    expect(() => noWildIamPolicy(policy, { compiled })).toThrow(
      "iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('blocks string Fn::Join created * resources', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: [{ 'Fn::Join': ['', ['*']] }]
                }
              ]
            }
          }
        ]
      }
    }
    expect(() => noWildIamPolicy(policy, { compiled })).toThrow(
      "iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('blocks string Fn::Sub created * resources', () => {
    compiled['cloudformation-template-update-stack.json'].Resources.iamStatement = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['s3:getObject'],
                  Resource: [{ 'Fn::Sub': ['*'] }]
                }
              ]
            }
          }
        ]
      }
    }
    
    expect(() => noWildIamPolicy(policy, { compiled })).toThrow(
      "iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })
})
