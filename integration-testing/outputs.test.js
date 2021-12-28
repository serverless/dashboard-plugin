'use strict';

const { expect } = require('chai');
const spawn = require('child-process-ext/spawn');
const fixturesEngine = require('../test/fixtures');
const setupServerless = require('../test/setupServerless');

describe('integration: outputs', () => {
  let setupServiceDir;
  let consumerServiceDir;
  let isSetupDeployed;
  let serverlessExec;
  before(async () => {
    const result = await Promise.all([
      fixturesEngine.setup('function', {
        configExt: {
          org: process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration',
          app: process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration',
          provider: {
            stage: process.env.SERVERLESS_PLATFORM_TEST_STAGE || 'dev',
            region: process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1',
          },
          outputs: { outputVariable: 'outputValue' },
        },
      }),
      setupServerless().then((data) => data.binary),
    ]);
    setupServiceDir = result[0].servicePath;
    const serviceName = result[0].serviceConfig.service;
    serverlessExec = result[1];

    [, { servicePath: consumerServiceDir }] = await Promise.all([
      spawn(serverlessExec, ['deploy'], { cwd: setupServiceDir }).then(() => {
        isSetupDeployed = true;
      }),
      fixturesEngine.setup('function', {
        configExt: {
          org: process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration',
          app: process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration',
          provider: {
            stage: process.env.SERVERLESS_PLATFORM_TEST_STAGE || 'dev',
            region: process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1',
          },
          custom: {
            testOutput: `\${output:${serviceName}.outputVariable, 'missingValue'}`,
          },
        },
      }),
    ]);
  });

  after(async () => {
    if (!isSetupDeployed) return;
    await spawn(serverlessExec, ['remove'], { cwd: setupServiceDir });
  });

  it('can publish and consume outputs', async () => {
    expect(
      String(
        (
          await spawn(serverlessExec, ['print', '--path', 'custom.testOutput'], {
            cwd: consumerServiceDir,
          })
        ).stdoutBuffer
      )
    ).to.include('outputValue');
  });
});
