import { cloneDeep } from 'lodash'
import runPolicies, { loadPolicy } from './'
import { getAccessKeyForTenant, getSafeguardsConfig } from '@serverless/platform-sdk'

const shieldEmoji = '\uD83D\uDEE1\uFE0F '
const lockEmoji = '\uD83D\uDD12'
const warningEmoji = '\u26A0\uFE0F'
const emDash = '\u2014'

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('access-key')),
  getSafeguardsConfig: jest.fn(),
  urls: { frontendUrl: 'https://dashboard.serverless.com/' }
}))

jest.mock('node-dir', () => ({
  readFiles: jest.fn().mockReturnValue(Promise.resolve())
}))

jest.mock('fs-extra', () => ({
  readdir: jest
    .fn()
    .mockReturnValue(Promise.resolve(['.serverless/cloudformation-template-update-stack.json'])),
  readFile: jest.fn().mockReturnValue(
    Promise.resolve(
      JSON.stringify({
        Resources: {}
      })
    )
  )
}))

afterEach(() => jest.restoreAllMocks())

const requireDlq = require('./policies/require-dlq')
jest.mock('./policies/require-dlq', () =>
  jest.fn().mockImplementation((policy) => {
    policy.approve()
  })
)
const iamPolicy = require('./policies/no-wild-iam-role-statements')
jest.mock('./policies/no-wild-iam-role-statements', () =>
  jest.fn().mockImplementation((policy) => {
    policy.approve()
  })
)
const secretsPolicy = require('./policies/no-secret-env-vars')
jest.mock('./policies/no-secret-env-vars', () =>
  jest.fn().mockImplementation((policy) => {
    policy.warn('!!!!')
    policy.approve()
  })
)

describe('safeguards - loadPolicy', () => {
  it('loads a safeguard from inside the plugin', async () => {
    expect(typeof loadPolicy('./policies', 'require-dlq')).toBe('function')
  })

  it('loads a safeguard from outside the plugin', async () => {
    expect(
      typeof loadPolicy('../../../examples/safeguards-example-service/policies', 'no-wild-cors')
    ).toBe('function')
  })
})

describe('safeguards', () => {
  let log
  const defualtCtx = {
    sls: {
      config: { servicePath: '.' },
      service: {
        custom: {}
      },
      cli: {}
    },
    provider: {
      naming: {}
    },
    state: {}
  }
  beforeEach(() => {
    log = jest.fn()
    defualtCtx.sls.cli.log = log
  })

  it('does nothing when safeguards explicity disabled', async () => {
    getSafeguardsConfig.mockReturnValue(Promise.resolve([]))
    const ctx = cloneDeep(defualtCtx)
    ctx.sls.service.custom.safeguards = false
    await runPolicies(ctx)
    expect(log).toHaveBeenCalledTimes(0)
  })

  it('loads & runs 2 safeguards when specified by remote config', async () => {
    getSafeguardsConfig.mockReturnValue(
      Promise.resolve([
        { ruleName: 'Require Dead Letter Queues', policyName: 'require-dlq' },
        { ruleName: 'no wild iam', policyName: 'no-wild-iam-role-statements' }
      ])
    )
    const ctx = cloneDeep(defualtCtx)
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([
      [`(${shieldEmoji}Safeguards) Loading 2 policies.`, `Serverless Enterprise`],
      [
        `(${shieldEmoji}Safeguards) Running policy "Require Dead Letter Queues"...`,
        `Serverless Enterprise`
      ],
      [`(${shieldEmoji}Safeguards) Running policy "no wild iam"...`, `Serverless Enterprise`],
      [`(${shieldEmoji}Safeguards) ${lockEmoji} All policies satisfied.`, `Serverless Enterprise`]
    ])
    expect(requireDlq).toHaveBeenCalledTimes(1)
    expect(iamPolicy).toHaveBeenCalledTimes(1)
  })

  it('loads & runs 1 warning safeguards when specified by remote config', async () => {
    getSafeguardsConfig.mockReturnValue(
      Promise.resolve([
        {
          ruleName: 'no secrets',
          policyName: 'no-secret-env-vars',
          policyUid: 'nos-secrest-policy-id'
        }
      ])
    )
    const ctx = cloneDeep(defualtCtx)
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([
      [`(${shieldEmoji}Safeguards) Loading 1 policy.`, `Serverless Enterprise`],
      [`(${shieldEmoji}Safeguards) Running policy "no secrets"...`, `Serverless Enterprise`],
      [
        `(${shieldEmoji}Safeguards) ${warningEmoji} Policy "no secrets" issued a warning ${emDash} !!!!
For info on how to resolve this, see: https://github.com/serverless/enterprise/blob/master/docs/safeguards.md#no-secret-env-vars
Or view this policy on the Serverless Dashboard: https://dashboard.serverless.com/safeguards/nos-secrest-policy-id`,
        `Serverless Enterprise`
      ],
      [
        `(${shieldEmoji}Safeguards) 1 policy reported irregular conditions. For details, see the logs above.
      ${warningEmoji} no-secret-env-vars: Warned of a non-critical condition.`,
        `Serverless Enterprise`
      ]
    ])
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })
})
