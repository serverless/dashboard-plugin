'use strict';

const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => null,
  },
};

const userNodeVersion = Number(process.version.split('.')[0].slice(1));

describe('studio', () => {
  it('Should crash when not logged in', async () => {
    if (userNodeVersion < 8) {
      return;
    }

    try {
      await runServerless({
        fixture: 'aws-monitored-service',
        command: 'studio',
        modulesCacheStub,
      });
      throw new Error('Unexpected');
    } catch (error) {
      if (error.code !== 'DASHBOARD_LOGGED_OUT') throw error;
    }
  });
});
