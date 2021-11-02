'use strict';

const { expect } = require('chai');
const stripAnsi = require('strip-ansi');
const setup = require('./setup');

let sls;

describe('integration: params', () => {
  before(async () => ({ sls } = await setup('service2')));

  it('print contains the params in the deploy profile', async () => {
    const stdout = stripAnsi(
      String((await sls(['print', '--path', 'custom.testParam'])).stdoutBuffer)
    );
    expect(stdout).to.include('testSecretValue\n\n');
  });
});
