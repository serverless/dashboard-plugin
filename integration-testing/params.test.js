'use strict';

const { expect } = require('chai');
const spawn = require('child-process-ext/spawn');
const fixturesEngine = require('../test/fixtures');
const setupServerless = require('../test/setup-serverless');
const { serviceSlug } = require('../lib/utils');
const { getPlatformClientWithAccessKey } = require('../lib/client-utils');

describe('integration: params', () => {
  let serviceDir;
  let serverlessExec;
  before(async () => {
    const org = process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration';
    const app = process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration';
    const result = await Promise.all([
      fixturesEngine.setup('function', {
        configExt: {
          org,
          app,
          provider: {
            stage: process.env.SERVERLESS_PLATFORM_TEST_STAGE || 'dev',
            region: process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1',
          },
          custom: {
            testServiceParam: '${param:testService, null}',
          },
        },
      }),
      setupServerless().then((data) => data.binary),
    ]);
    serviceDir = result[0].servicePath;
    const serviceName = result[0].serviceConfig.service;
    serverlessExec = result[1];
    const sdk = await getPlatformClientWithAccessKey(org);
    const { orgUid } = await sdk.getOrgByName(org);
    await sdk.createParam(orgUid, 'service', serviceSlug({ app, service: serviceName }), {
      paramName: 'testService',
      paramValue: 'testServiceParamValue',
    });
  });

  it('print contains the params', async () => {
    expect(
      String(
        (
          await spawn(serverlessExec, ['print', '--path', 'custom.testServiceParam'], {
            cwd: serviceDir,
          })
        ).stdoutBuffer
      )
    ).to.include('testServiceParamValue');
  });
});
