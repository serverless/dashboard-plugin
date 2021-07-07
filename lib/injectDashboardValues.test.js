'use strict';

const { expect } = require('chai');
const runServerless = require('../test/run-serverless');
const configUtils = require('@serverless/utils/config');

const STAGE = 'dev';
const ORG_UID = 'orgUid';
const APP_UID = 'appUid';
const SERVICE_NAME = 'serviceName';

const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => ({ accessKeys: { testinteractivecli: 'accesskey' } }),
  },
  [platformClientPath]: {
    ServerlessSDK: class ServerlessSDK {
      constructor() {
        this.metadata = {
          get: async () => ({ supportedRegions: ['us-east-1'] }),
        };

        this.apps = {
          get: async () => ({ appUid: APP_UID, tenantUid: ORG_UID }),
        };

        this.logDestinations = {
          getOrCreate: async () => ({ destinationArn: 'arn:logdest' }),
        };
      }

      async getOrgByName() {
        return { orgUid: 'foobar' };
      }

      async getProvidersByOrgServiceInstance() {
        return {};
      }
    },
  },
};

describe('injectDashboardValues', () => {
  it('load dashboard values into cloudformation as env vars', async () => {
    const { awsNaming, cfTemplate } = await runServerless({
      fixture: 'function',
      command: 'package',
      modulesCacheStub,
      configExt: {
        service: SERVICE_NAME, // force deterministic service name
      },
      awsRequestStubMap: {
        STS: {
          getCallerIdentity: {
            ResponseMetadata: { RequestId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
            UserId: 'XXXXXXXXXXXXXXXXXXXXX',
            Account: '999999999999',
            Arn: 'arn:aws:iam::999999999999:user/test',
          },
        },
      },
    });

    const functionCfLogicalId = awsNaming.getLambdaLogicalId('function');
    const functionCfConfig = cfTemplate.Resources[functionCfLogicalId].Properties;
    const envVars = functionCfConfig.Environment.Variables;

    expect(envVars.SERVERLESS_DASHBOARD_APP_UID).to.equal(APP_UID);
    expect(envVars.SERVERLESS_DASHBOARD_ORG_UID).to.equal(ORG_UID);
    expect(envVars.SERVERLESS_STAGE).to.equal(STAGE);
    expect(envVars.SERVERLESS_SERVICE).to.equal(SERVICE_NAME);
  });
});
