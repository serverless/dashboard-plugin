'use strict';

const { join } = require('path');
const runServerless = require('../test/run-serverless');

const fixturesPath = join(__dirname, '../test/fixtures');
const awsMonitoredServicePath = join(fixturesPath, 'aws-monitored-service');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const platformClientPath = require.resolve('@serverless/platform-client');

const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getLoggedInUser: () => ({
      username: 'foo',
    }),
    getDeployProfile: () => ({}),
    getMetadata: () => ({
      supportedRegions: ['us-east-1'],
    }),
    getApp: () => ({
      wtf: 'wtf should this be',
    }),
  },
  [platformClientPath]: {
    ServerlessSDK: class ServerlessSDK {
      async getOrgByName() {
        return { orgUid: 'foobar' };
      }

      async getProvidersByOrgServiceInstance() {
        return {
          result: [
            {
              providerName: 'aws',
              providerType: 'roleArn',
              providerDetails: {
                accessKeyId: 'aaron stuyvenberg access key',
                secretAccessKey: 'aaron stuyvenberg secret key',
                sessionToken: 'aaron stuyvenberg session token',
              },
            },
          ],
        };
      }
    },
  },
};

describe('deployProfile', function () {
  this.timeout(1000 * 60 * 3);

  it('Should override with credentials', async () => {
    try {
      const { serverless } = await runServerless({
        cwd: awsMonitoredServicePath,
        cliArgs: ['print'],
        modulesCacheStub: {
          [platformSdkPath]: {
            ...modulesCacheStub[platformSdkPath],
          },
          [platformClientPath]: {
            ...modulesCacheStub[platformClientPath],
          },
        },
      });
      expect(serverless.providers.aws.cachedCredentials).to.deep.equal({
        accessKeyId: 'aaron stuyvenberg access key',
        secretAccessKey: 'aaron stuyvenberg secret key',
        sessionToken: 'aaron stuyvenberg session token',
        region: 'us-east-1',
      });
    } catch (error) {
      if (error.code !== 'DASHBOARD_LOGGED_OUT') throw error;
    }
  });
});
