'use strict';

const { join } = require('path');
const runServerless = require('@serverless/test/run-serverless');

const setupServerless = require('../test/setupServerless');

const awsMonitoredServicePath = join(__dirname, '../test/fixtures/aws-monitored-service');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getLoggedInUser: () => ({}),
  },
};

const userNodeVersion = Number(process.version.split('.')[0].slice(1));

describe('dev mode', function() {
  this.timeout(1000 * 60 * 3);
  let serverlessPath;

  before(async () => {
    serverlessPath = (await setupServerless()).root;
  });

  it('Should crash when not logged in', async () => {
    if (userNodeVersion < 8) {
      this.skip();
    }

    try {
      await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['dev'],
        modulesCacheStub: {
          [platformSdkPath]: {
            ...modulesCacheStub[platformSdkPath],
            getLoggedInUser: () => null,
          },
        },
      });
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.code).to.equal('DASHBOARD_LOGGED_OUT');
    }
  });
});
