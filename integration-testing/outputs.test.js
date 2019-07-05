const stripAnsi = require('strip-ansi')
const setup = require('./setup')

let sls1; let sls2; let teardown

jest.setTimeout(1000 * 60 * 3)

beforeAll(
  async () =>
    ([{ sls: sls1, teardown }, { sls: sls2 }] = await Promise.all([
      setup('service'),
      setup('service2'),
    ]))
)

afterAll(() => {
  if (teardown) {
    return teardown()
  }
})

describe('integration', () => {
  it('can publish and consume outputs', async () => {
    await sls1(['deploy'])

    const printStdout = stripAnsi(
      String((await sls2(['print', '--path', 'custom.testOutput'])).stdoutBuffer)
    )
    expect(printStdout).toMatch('outputValue\n\n')
  })
})
