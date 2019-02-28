import requireDlq from './require-dlq'

describe('requireDlq', () => {
  let policy
  let service

  beforeEach(() => {
    policy = { approve: jest.fn(), warn: jest.fn(), Failure: Error }
    service = {
      compiled: { 'cloudformation-template-update-stack.json': { Resources: {} } },
      declaration: {
        functions: {
          func: {}
        }
      },
      provider: { naming: { getLambdaLogicalId: fnName => `${fnName}Lambda` } }
    }
  })

  it('allows functions with a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::IAM::Function',
      Properties: {
        DeadLetterConfig: { TargetArn: 'arn' }
      }
    }
    requireDlq(policy, service)
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })

  it('blocks functions with out a DLQ', () => {
    service.compiled['cloudformation-template-update-stack.json'].Resources.funcLambda = {
      Type: 'AWS::Lambda::Function',
      Properties: {}
    }
    expect(() => requireDlq(policy, service)).toThrow(
      `Function "func" doesn't have a Dead Letter Queue configured.`
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.warn).toHaveBeenCalledTimes(0)
  })
})
