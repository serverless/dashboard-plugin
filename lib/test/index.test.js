'use strict';

const chalk = require('chalk');
const runTest = require('./runTest');
const { test: testFunc } = require('./');

const realStdoutWrite = process.stdout.write;

afterEach(() => {
  process.stdout.write = realStdoutWrite;
  jest.restoreAllMocks();
});

beforeEach(() => {
  process.stdout.write = jest.fn();
});

jest.mock('fs-extra', () => ({
  exists: jest.fn().mockReturnValue(Promise.resolve(true)),
  readFile: jest.fn().mockReturnValue(
    Promise.resolve(
      JSON.stringify([
        {
          name: 'foobar',
          endpoint: { function: 'blah', path: 'blah', method: 'post' },
          response: { body: 'foobar' },
          request: { headers: { Foo: 'bar' } },
        },
      ])
    )
  ),
}));
jest.mock('./runTest', () => jest.fn().mockReturnValue(Promise.resolve()));

describe('test', () => {
  it('calls runTest', async () => {
    const ctx = {
      sls: {
        enterpriseEnabled: true,
        processedInput: { options: {} },
        cli: { log: jest.fn() },
        service: { functions: [] },
      },
      provider: {
        naming: {
          getServiceEndpointRegex: jest.fn().mockReturnValue('http'),
          getStackName: jest.fn().mockReturnValue('stack'),
        },
        request: jest.fn().mockReturnValue(
          Promise.resolve({
            Stacks: [{ Outputs: [{ OutputKey: 'http', OutputValue: 'https://example.com' }] }],
          })
        ),
      },
    };
    await testFunc(ctx);
    expect(runTest).toBeCalledWith(
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
    expect(ctx.sls.cli.log.mock.calls).toEqual([
      [
        `Test Results:

   Summary --------------------------------------------------
`,
      ],
      [`Test Summary: ${chalk.green('1 passed')}, ${chalk.red('0 failed')}`],
    ]);
    expect(process.stdout.write.mock.calls).toEqual([
      ['  running - POST blah - foobar'],
      [`\r   ${chalk.green('passed')} - POST blah - foobar\n`],
      ['\n'],
    ]);
  });

  it('logs message if sfe not enabled', async () => {
    const ctx = { sls: { cli: { log: jest.fn() } } };
    await testFunc(ctx);
    expect(ctx.sls.cli.log).toBeCalledWith(
      'Run "serverless" to configure your service for testing.'
    );
    expect(process.stdout.write.mock.calls).toEqual([]);
  });
});
