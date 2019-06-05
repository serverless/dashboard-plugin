import path from 'path'
import { npm, sls } from './commands'

const SERVERLESS_PLATFORM_STAGE = process.env.SERVERLESS_PLATFORM_STAGE || 'dev'

beforeAll(() => npm(['install']))

describe('integration', () => {
  it('can publish and consume outputs', () => {
    const deployProc = sls(['deploy'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE },
      cwd: path.join(__dirname, 'service')
    })
    expect(deployProc.status).toEqual(0)

    const printProc = sls(['print', '--path', 'custom.testOutput'], {
      stdio: 'pipe',
      env: { ...process.env, SERVERLESS_PLATFORM_STAGE },
      cwd: path.join(__dirname, 'service2')
    })
    const printStdout = printProc.stdout.toString()
    expect(printStdout).toMatch('outputValue\n\n')
    expect(printProc.status).toEqual(0)
  })
})
