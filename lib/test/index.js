'use strict';

const { entries, find } = require('lodash');
const fse = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');

const runTest = require('./runTest');

module.exports.test = async (ctx) => {
  if (!ctx.sls.enterpriseEnabled) {
    throw new ctx.sls.classes.Error('Run "serverless" to configure your service for testing.');
  }
  if (!fse.exists('serverless.test.yml')) {
    throw new ctx.sls.classes.Error('No serverless.test.yml file found');
  }
  let tests = yaml.load(await fse.readFile('serverless.test.yml'));

  const { options } = ctx.sls.processedInput;
  if (options.function) {
    tests = tests.filter(({ endpoint }) => endpoint.function === options.function);
  }
  if (options.test) {
    tests = tests.filter(({ name }) => name === options.test);
  }

  const cfnStack = await ctx.provider.request('CloudFormation', 'describeStacks', {
    StackName: ctx.provider.naming.getStackName(),
  });
  const apigResource = find(
    cfnStack.Stacks[0].Outputs,
    ({ OutputKey }) =>
      !OutputKey.endsWith('Websocket') &&
      OutputKey.match(ctx.provider.naming.getServiceEndpointRegex())
  );
  const baseApiUrl = apigResource.OutputValue;

  ctx.sls.cli.log(
    `Test Results:

   Summary --------------------------------------------------
`
  );

  const errors = [];
  let numTests = 0;

  const funcs = ctx.sls.service.functions || {};
  for (const testSpec of tests || []) {
    let method = testSpec.endpoint.method;
    if (!method) {
      if (typeof funcs[testSpec.endpoint.function].events[0].http === 'string') {
        method = funcs[testSpec.endpoint.function].events[0].http.split(' ')[0];
      } else {
        method = funcs[testSpec.endpoint.function].events[0].http.method;
      }
    }
    let path = testSpec.endpoint.path;
    if (!path) {
      if (typeof funcs[testSpec.endpoint.function].events[0].http === 'string') {
        path = funcs[testSpec.endpoint.function].events[0].http.split(' ')[1];
      } else {
        path = funcs[testSpec.endpoint.function].events[0].http.path;
      }
    }
    const testName = `${method.toUpperCase()} ${path} - ${testSpec.name}`;
    try {
      numTests += 1;
      process.stdout.write(`  running - ${testName}`);
      await runTest(testSpec, path, method, baseApiUrl);
      process.stdout.write(`\r   ${chalk.green('passed')} - ${testName}\n`);
    } catch (error) {
      errors.push({ testSpec, error });
      process.stdout.write(`\r   ${chalk.red('failed')} - ${testName}\n`);
    }
  }
  process.stdout.write('\n');
  if (errors.length > 0) {
    process.stdout.write(
      `   ${chalk.yellow('Details --------------------------------------------------')}\n\n`
    );

    for (let i = 0; i < errors.length; i++) {
      const { error, testSpec } = errors[i];
      const { headers, status } = error.resp;
      process.stdout.write(`   ${i + 1}) ${chalk.red(`Failed -  ${testSpec.name}`)}\n`);
      const info = `      status: ${status}
      headers:
    ${entries(headers._headers)
      .map(([key, value]) => `    ${key}: ${value}`)
      .join('\n')
      .replace(/\n/g, '\n    ')}
      body: ${error.body}`;
      process.stdout.write(chalk.grey(info));

      const expectedAndReceived = `
      expected: ${error.field} = ${
        typeof error.expected === 'object'
          ? JSON.stringify(error.expected, null, 2).replace(/\n/g, '\n      ')
          : error.expected
      }
      received: ${error.field} = ${
        typeof error.received === 'object'
          ? JSON.stringify(error.received, null, 2).replace(/\n/g, '\n      ')
          : error.received
      }\n\n`;
      process.stdout.write(`\n${chalk.white(expectedAndReceived)}`);
    }
  }

  const passed = chalk.green(`${numTests - errors.length} passed`);
  const failed = chalk.red(`${errors.length} failed`);
  ctx.sls.cli.log(`Test Summary: ${passed}, ${failed}`);

  if (errors.length) {
    throw new ctx.sls.classes.Error('Test run failed', 'TEST_FAILURE');
  }
};
