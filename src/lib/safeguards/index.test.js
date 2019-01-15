import { cloneDeep } from 'lodash'
import runPolicies, { loadPolicy } from './'

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
  const log = jest.fn()
  const defualtCtx = {
    sls: {
      config: { servicePath: '.' },
      service: {
        custom: {}
      },
      cli: { log }
    },
    provider: {
      naming: {}
    }
  }
  afterAll(() => log.resetMock())

  it('does nothing when safeguards not enabled', async () => {
    const ctx = cloneDeep(defualtCtx)
    await runPolicies(ctx)
    expect(log).toHaveBeenCalledTimes(0)
  })

  it('does nothing when safeguards explicity disabled', async () => {
    const ctx = cloneDeep(defualtCtx)
    ctx.sls.service.custom.safeguards = false
    await runPolicies(ctx)
    expect(log).toHaveBeenCalledTimes(0)
  })

  it('loads & runs safeguards with the deault config', async () => {
    const ctx = cloneDeep(defualtCtx)
    ctx.sls.service.custom.safeguards = true
    await runPolicies(ctx)
    expect(requireDlq).toHaveBeenCalledTimes(1)
    expect(iamPolicy).toHaveBeenCalledTimes(1)
    expect(secretsPolicy).toHaveBeenCalledTimes(1)
  })
})
