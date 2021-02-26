'use strict';

const { expect } = require('chai');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getDeployProfile: () => {
      throw new Error('No application');
    },
    getApp: () => ({}),
  },
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => ({
      username: 'foo',
    }),
  },
  [platformClientPath]: {
    ServerlessSDK: class ServerlessSDK {
      constructor() {
        this.metadata = {
          get: async () => ({
            supportedRegions: ['us-east-1'],
          }),
        };
      }

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
    const { serverless } = await runServerless({
      fixture: 'aws-monitored-service',
      cliArgs: ['print'],
      modulesCacheStub,
    });
    expect(serverless.providers.aws.cachedCredentials).to.deep.equal({
      accessKeyId: 'aaron stuyvenberg access key',
      secretAccessKey: 'aaron stuyvenberg secret key',
      sessionToken: 'aaron stuyvenberg session token',
      region: 'us-east-1',
    });
  });
  it('Should use local credentials with flag', async () => {
    const { serverless } = await runServerless({
      fixture: 'aws-monitored-service',
      cliArgs: ['print', '--use-local-credentials'],
      modulesCacheStub,
    });
    expect(serverless.providers.aws.cachedCredentials).to.be.null;
  });
});
