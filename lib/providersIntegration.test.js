'use strict';

const { expect } = require('chai');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => ({
      username: 'foo',
      accessKeys: { testinteractivecli: 'accesskey' },
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

        this.deploymentProfiles = {
          get: () => {
            throw new Error('No application');
          },
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
              alias: 'providerAlias',
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
      command: 'print',
      modulesCacheStub,
    });
    expect(serverless.providers.aws.cachedCredentials).to.deep.equal({
      dashboardProviderAlias: 'providerAlias',
      accessKeyId: 'aaron stuyvenberg access key',
      secretAccessKey: 'aaron stuyvenberg secret key',
      sessionToken: 'aaron stuyvenberg session token',
      region: 'us-east-1',
    });
  });
  it('Should use local credentials with flag', async () => {
    const { serverless } = await runServerless({
      fixture: 'aws-monitored-service',
      command: 'print',
      options: { 'use-local-credentials': true },
      modulesCacheStub,
    });
    expect(serverless.providers.aws.cachedCredentials).to.be.null;
  });
});
