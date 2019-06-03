import { npm, sls } from './commands'

const SERVERLESS_PLATFORM_STAGE = process.env.SERVERLESS_PLATFORM_STAGE || 'dev'

beforeAll(() => npm(['install']))

describe('integration', () => {
  it('deploys with no extra options, warns on cfn role', () => {
    const proc = sls(['deploy'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE }
    })
    expect(proc.status).toEqual(0)
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch('warned - require-cfn-role')
    expect(stdout).toMatch('Warned - no cfnRole set')
  })

  it('deploys blocks deploy on illegal stage name', () => {
    const proc = sls(['deploy', '-s', 'illegal-stage-name'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE }
    })
    expect(proc.status).toEqual(1)
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch('failed - allowed-stages')
    expect(stdout).toMatch(
      'Failed - Stage name "illegal-stage-name" not in list of permitted names: ["dev","qa","prod"]'
    )
  })

  it('deploys blocks deploy on disallowed region', () => {
    const proc = sls(['deploy', '-r', 'us-west-1'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE }
    })
    expect(proc.status).toEqual(1)
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch('failed - allowed-regions')
    expect(stdout).toMatch('Failed - ')
  })

  it('deploys warns when using a bad IAM role', () => {
    const proc = sls(['deploy'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE, IAM_ROLE: 'badIamRole' }
    })
    expect(proc.status).toEqual(0)
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch('warned - no-wild-iam-role-statements')
    expect(stdout).toMatch(
      `Warned - iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted.`
    )
  })

  it('deploys warns when using a env var', () => {
    const proc = sls(['deploy'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        SERVERLESS_PLATFORM_STAGE,
        ENV_OPT: '-----BEGIN RSA PRIVATE KEY-----'
      }
    })
    expect(proc.status).toEqual(0)
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch('warned - no-secret-env-vars')
    expect(stdout).toMatch(
      `Warned - Environment variable variable1 on function 'hello' looks like it contains a secret value`
    )
  })

  it('deploys warns about dlq when not using an HTTP event', () => {
    const proc = sls(['deploy'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE, EVENTS: 'noEvents' }
    })
    expect(proc.status).toEqual(0)
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch('warned - require-dlq')
    expect(stdout).toMatch(
      `Warned - Function \"hello\" doesn't have a Dead Letter Queue configured.`
    )
  })
})
