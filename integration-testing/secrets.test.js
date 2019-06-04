import path from 'path'
import { npm, sls } from './commands'

const SERVERLESS_PLATFORM_STAGE = process.env.SERVERLESS_PLATFORM_STAGE || 'dev'
const cwd = path.join(__dirname, 'service2')

beforeAll(() => npm(['install']))

describe('integration', () => {
  it('print contains the secret in the deploy profile', () => {
    const proc = sls(['print', '--path', 'custom.testSecret'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE },
      cwd
    })
    const stdout = proc.stdout.toString()
    expect(stdout).toMatch(/^testSecretValue$/m)
    expect(proc.status).toEqual(0)
  })
})
