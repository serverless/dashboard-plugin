'use strict';

const runServerless = require('../test/run-serverless');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getLoggedInUser: () => ({}),
  },
};

const userNodeVersion = Number(process.version.split('.')[0].slice(1));

describe('studio', function () {
  this.timeout(1000 * 60 * 3);

  it('Should crash when not logged in', async () => {
    if (userNodeVersion < 8) {
      return;
    }

    try {
      await runServerless({
        fixture: 'aws-monitored-service',
        cliArgs: ['studio'],
        modulesCacheStub: {
          [platformSdkPath]: {
            ...modulesCacheStub[platformSdkPath],
            getLoggedInUser: () => null,
          },
        },
      });
      throw new Error('Unexpected');
    } catch (error) {
      if (error.code !== 'DASHBOARD_LOGGED_OUT') throw error;
    }
  });
});
