'use strict';

const stripAnsi = require('strip-ansi');
const setup = require('./setup');

let sls;

describe('integration: secrets', function() {
  this.timeout(1000 * 60 * 3);

  beforeAll(async () => ({ sls } = await setup('service2')));

  it('print contains the secret in the deploy profile', async () => {
    const stdout = stripAnsi(
      String((await sls(['print', '--path', 'custom.testSecret'])).stdoutBuffer)
    );
    expect(stdout).toMatch('testSecretValue\n\n');
  });
});
