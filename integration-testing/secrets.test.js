'use strict';

const stripAnsi = require('strip-ansi')
const setup = require('./setup')

let sls

jest.setTimeout(1000 * 60 * 3)

beforeAll(async () => ({ sls } = await setup('service2')))

describe('integration', () => {
  it('print contains the secret in the deploy profile', async () => {
    const stdout = stripAnsi(
      String((await sls(['print', '--path', 'custom.testSecret'])).stdoutBuffer)
    )
    expect(stdout).toMatch('testSecretValue\n\n')
  })
})
