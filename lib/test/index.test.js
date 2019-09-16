'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const chalk = require('chalk');

const runTest = sinon.stub().resolves();
const { test: testFunc } = proxyquire('./', {
  './runTest': runTest,
  'fs-extra': {
    exists: async () => true,
    readFile: async () =>
      JSON.stringify([
        {
          name: 'foobar',
          endpoint: { function: 'blah', path: 'blah', method: 'post' },
          response: { body: 'foobar' },
          request: { headers: { Foo: 'bar' } },
        },
      ]),
  },
});

const realStdoutWrite = process.stdout.write;

describe('test', () => {
  afterEach(() => {
    process.stdout.write = realStdoutWrite;
  });

  beforeEach(() => {
    process.stdout.write = sinon.spy();
  });

  it('calls runTest', async () => {
    const ctx = {
      sls: {
        enterpriseEnabled: true,
        processedInput: { options: {} },
        cli: { log: sinon.spy() },
        service: { functions: [] },
      },
      provider: {
        naming: {
          getServiceEndpointRegex: () => 'http',
          getStackName: () => 'stack',
        },
        request: async () => ({
          Stacks: [{ Outputs: [{ OutputKey: 'http', OutputValue: 'https://example.com' }] }],
        }),
      },
    };
    await testFunc(ctx);
    expect(runTest.args[0][0]).to.deep.equal(
      {
        name: 'foobar',
        endpoint: { function: 'blah', path: 'blah', method: 'post' },
        response: { body: 'foobar' },
        request: { headers: { Foo: 'bar' } },
      },
      'blah',
      'post',
      'https://example.com'
    );
    expect(ctx.sls.cli.log.args).to.deep.equal([
      [
        `Test Results:

   Summary --------------------------------------------------
`,
      ],
      [`Test Summary: ${chalk.green('1 passed')}, ${chalk.red('0 failed')}`],
    ]);
    expect(process.stdout.write.args).to.deep.equal([
      ['  running - POST blah - foobar'],
      [`\r   ${chalk.green('passed')} - POST blah - foobar\n`],
      ['\n'],
    ]);
  });

  it('logs message if sfe not enabled', async () => {
    const ctx = { sls: { cli: { log: sinon.spy() } } };
    await testFunc(ctx);
    expect(ctx.sls.cli.log.calledWith('Run "serverless" to configure your service for testing.')).to
      .be.true;
    expect(process.stdout.write.args).to.deep.equal([]);
  });
});
