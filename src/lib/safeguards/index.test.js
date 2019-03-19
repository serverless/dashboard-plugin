import { cloneDeep } from 'lodash'
import chalk from 'chalk'
import runPolicies, { loadPolicy } from './'
import { getSafeguards } from '@serverless/platform-sdk'

const shieldEmoji = '\uD83D\uDEE1\uFE0F '
const warningEmoji = '\u26A0\uFE0F'
const gearEmoji = '\u2699\uFE0F'
const xEmoji = '\u274C'
const checkEmoji = '\u2705'

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('access-key')),
  getSafeguards: jest.fn(),
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
    policy.fail('Error Message')
  })
)

const realStdoutWrite = process.stdout.write

afterEach(() => {
  process.stdout.write = realStdoutWrite
  jest.restoreAllMocks()
})

beforeEach(() => {
  process.stdout.write = jest.fn()
  secretsPolicy.mockClear()
  secretsPolicy.docs = 'https://git.io/secretDocs'
  requireDlq.mockClear()
  requireDlq.docs = 'https://git.io/dlqDocs'
  iamPolicy.mockClear()
  iamPolicy.docs = 'https://git.io/iamDocs'
})

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

  it('does nothing when there are no safeguards', async () => {
    getSafeguards.mockReturnValue(Promise.resolve([]))
    const ctx = cloneDeep(defualtCtx)
    ctx.sls.service.custom.safeguards = false
    await runPolicies(ctx)
    expect(log).toHaveBeenCalledTimes(0)
    expect(process.stdout.write).toHaveBeenCalledTimes(0)
  })

  it('loads & runs 2 safeguards when specified by remote config', async () => {
    getSafeguards.mockReturnValue(
      Promise.resolve([
        {
          title: 'Require Dead Letter Queues',
          safeguardName: 'require-dlq',
          policyUid: 'asdfasfdasf',
          enforcementLevel: 'error',
          safeguardConfig: null
        },
        {
          title: 'no wild iam',
          safeguardName: 'no-wild-iam-role-statements',
          policyUid: 'asdfasfdasabdaslfhsaf',
          enforcementLevel: 'error',
          safeguardConfig: null
        }
      ])
    )
    const ctx = cloneDeep(defualtCtx)
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([[`${shieldEmoji} Safeguards`, `Serverless Enterprise`]])
    expect(process.stdout.write.mock.calls).toEqual([
      [`    Require Dead Letter Queues: ${gearEmoji} running...`],
      [`\r    Require Dead Letter Queues: ${checkEmoji} `],
      [chalk.green(`passed     \n`)],
      [`    no wild iam: ${gearEmoji} running...`],
      [`\r    no wild iam: ${checkEmoji} `],
      [chalk.green(`passed     \n`)]
    ])
    expect(requireDlq).toHaveBeenCalledTimes(1)
    expect(iamPolicy).toHaveBeenCalledTimes(1)
  })

  it('loads & runs 1 warning safeguards at enforcementLevel=warning when specified by remote config', async () => {
    getSafeguards.mockReturnValue(
      Promise.resolve([
        {
          title: 'no secrets',
          safeguardName: 'no-secret-env-vars',
          policyUid: 'nos-secrest-policy-id',
          enforcementLevel: 'warning',
          safeguardConfig: null
        }
      ])
    )
    const ctx = cloneDeep(defualtCtx)
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([[`${shieldEmoji} Safeguards`, `Serverless Enterprise`]])
    expect(process.stdout.write.mock.calls).toEqual([
      [`    no secrets: ${gearEmoji} running...`],
      [`\r    no secrets: ${warningEmoji} `],
      [
        chalk.keyword('orange')(`warned       
      Error Message
      For info on how to resolve this, see: https://git.io/secretDocs
`)
      ]
    ])
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })

  it('loads & runs 1 warning safeguards at enforcementLevel=error when specified by remote config', async () => {
    getSafeguards.mockReturnValue(
      Promise.resolve([
        {
          title: 'no secrets',
          safeguardName: 'no-secret-env-vars',
          policyUid: 'nos-secrest-policy-id',
          enforcementLevel: 'error',
          safeguardConfig: null
        }
      ])
    )
    const ctx = cloneDeep(defualtCtx)
    await expect(runPolicies(ctx)).rejects.toThrow(
      `(${shieldEmoji} Safeguards) 1 policy reported irregular conditions. For details, see the logs above.\n      ${xEmoji} no-secret-env-vars: Requirements not satisfied. Deployment halted.`
    )
    expect(log.mock.calls).toEqual([[`${shieldEmoji} Safeguards`, `Serverless Enterprise`]])
    expect(process.stdout.write.mock.calls).toEqual([
      [`    no secrets: ${gearEmoji} running...`],
      [`\r    no secrets: ${xEmoji} `],
      [
        chalk.red(`failed       
      Error Message
      For info on how to resolve this, see: https://git.io/secretDocs
`)
      ]
    ])
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })

  it('loads & runs default safeguards when specified by local config = true', async () => {
    getSafeguards.mockReturnValue(Promise.resolve([]))
    const ctx = cloneDeep(defualtCtx)
    ctx.sls.service.custom.safeguards = true
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([[`${shieldEmoji} Safeguards`, `Serverless Enterprise`]])
    expect(process.stdout.write.mock.calls).toEqual([
      [`    Default policy: require-dlq: ${gearEmoji} running...`],
      [`\r    Default policy: require-dlq: ${checkEmoji} `],
      [chalk.green(`passed     \n`)],
      [`    Default policy: no-wild-iam-role-statments: ${gearEmoji} running...`],
      [`\r    Default policy: no-wild-iam-role-statments: ${checkEmoji} `],
      [chalk.green(`passed     \n`)],
      [`    Default policy: no-secret-env-vars: ${gearEmoji} running...`],
      [`\r    Default policy: no-secret-env-vars: ${warningEmoji} `],
      [chalk.keyword('orange')(`warned       
      Error Message
      For info on how to resolve this, see: https://git.io/secretDocs
`)]
    ])
    expect(requireDlq).toHaveBeenCalledTimes(1)
    expect(iamPolicy).toHaveBeenCalledTimes(1)
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })
})
