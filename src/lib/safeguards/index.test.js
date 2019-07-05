'use strict';

const { cloneDeep } = require('lodash')
const chalk = require('chalk')
const runPolicies = require('./')
const { getSafeguards } = require('@serverless/platform-sdk')

const { loadPolicy } = runPolicies

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('access-key')),
  getSafeguards: jest.fn(),
  urls: { frontendUrl: 'https://dashboard.serverless.com/' },
}))

jest.mock('node-dir', () => ({
  readFiles: jest.fn().mockReturnValue(Promise.resolve()),
}))

jest.mock('fs-extra', () => ({
  readdir: jest
    .fn()
    .mockReturnValue(Promise.resolve(['.serverless/cloudformation-template-update-stack.json'])),
  readFile: jest.fn().mockReturnValue(
    Promise.resolve(
      JSON.stringify({
        Resources: {},
      })
    )
  ),
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
    expect(typeof loadPolicy(undefined, 'require-dlq')).toBe('function')
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
        custom: {},
      },
      cli: {},
    },
    provider: {
      naming: {},
    },
    state: {},
    safeguards: [],
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
    const ctx = cloneDeep(defualtCtx)
    ctx.safeguards = [
      {
        title: 'Require Dead Letter Queues',
        safeguardName: 'require-dlq',
        policyUid: 'asdfasfdasf',
        enforcementLevel: 'error',
        safeguardConfig: null,
        description: 'You gotta use a DLQ!',
      },
      {
        title: 'no wild iam',
        safeguardName: 'no-wild-iam-role-statements',
        policyUid: 'asdfasfdasabdaslfhsaf',
        enforcementLevel: 'error',
        safeguardConfig: null,
        describe: 'dude! no wild cards in iam roles!',
      },
    ]
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([
      ['Safeguards Processing...', 'Serverless Enterprise'],
      [
        `Safeguards Results:

   Summary --------------------------------------------------
`,
        'Serverless Enterprise',
      ],
      [
        `Safeguards Summary: ${chalk.green('2 passed')}, ${chalk.keyword('orange')(
          '0 warnings'
        )}, ${chalk.red('0 errors')}`,
        '\nServerless Enterprise',
      ],
    ])
    expect(process.stdout.write.mock.calls).toEqual([
      ['  running - Require Dead Letter Queues'],
      [`\r   ${chalk.green('passed')} - Require Dead Letter Queues\n`],
      ['  running - no wild iam'],
      [`\r   ${chalk.green('passed')} - no wild iam\n`],
    ])
    expect(requireDlq).toHaveBeenCalledTimes(1)
    expect(iamPolicy).toHaveBeenCalledTimes(1)
  })

  it('loads & runs 1 warning safeguards at enforcementLevel=warning when specified by remote config', async () => {
    const ctx = cloneDeep(defualtCtx)
    ctx.safeguards = [
      {
        title: 'no secrets',
        safeguardName: 'no-secret-env-vars',
        policyUid: 'nos-secrest-policy-id',
        enforcementLevel: 'warning',
        safeguardConfig: null,
        description: 'wtf yo? no secrets!',
      },
    ]
    await runPolicies(ctx)
    expect(log.mock.calls).toEqual([
      ['Safeguards Processing...', 'Serverless Enterprise'],
      [
        `Safeguards Results:

   Summary --------------------------------------------------
`,
        'Serverless Enterprise',
      ],
      [
        `Safeguards Summary: ${chalk.green('0 passed')}, ${chalk.keyword('orange')(
          '1 warnings'
        )}, ${chalk.red('0 errors')}`,
        '\nServerless Enterprise',
      ],
    ])
    expect(process.stdout.write.mock.calls).toEqual([
      ['  running - no secrets'],
      [`\r   ${chalk.keyword('orange')('warned')} - no secrets\n`],
      [
        `\n   ${chalk.yellow('Details --------------------------------------------------')}

   1) ${chalk.keyword('orange')('Warned - Error Message Error Message')}
      ${chalk.grey('details: https://git.io/secretDocs')}
      wtf yo? no secrets!

`,
      ],
    ])
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })

  it('loads & runs 1 error safeguards at enforcementLevel=error when specified by remote config', async () => {
    const ctx = cloneDeep(defualtCtx)
    ctx.safeguards = [
      {
        title: 'no secrets',
        safeguardName: 'no-secret-env-vars',
        policyUid: 'nos-secrest-policy-id',
        enforcementLevel: 'error',
        safeguardConfig: null,
        description: 'wtf yo? no secrets!',
      },
    ]
    await expect(runPolicies(ctx)).rejects.toThrow(
      'Deployment blocked by Serverless Enterprise Safeguards'
    )
    expect(log.mock.calls).toEqual([
      ['Safeguards Processing...', 'Serverless Enterprise'],
      [
        `Safeguards Results:

   Summary --------------------------------------------------
`,
        'Serverless Enterprise',
      ],
      [
        `Safeguards Summary: ${chalk.green('0 passed')}, ${chalk.keyword('orange')(
          '0 warnings'
        )}, ${chalk.red('1 errors')}`,
        '\nServerless Enterprise',
      ],
    ])
    expect(process.stdout.write.mock.calls).toEqual([
      ['  running - no secrets'],
      [`\r   ${chalk.red('failed')} - no secrets\n`],
      [
        `\n   ${chalk.yellow('Details --------------------------------------------------')}

   1) ${chalk.red('Failed - Error Message Error Message')}
      ${chalk.grey('details: https://git.io/secretDocs')}
      wtf yo? no secrets!

`,
      ],
    ])
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })
})
