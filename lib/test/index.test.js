'use strict';

const { expect } = require('chai');
const runServerless = require('../../test/run-serverless');

const modulesCacheStub = {
  '@serverless/enterprise-plugin/lib/test/runTest': async () => {},
  [require.resolve('@serverless/platform-sdk')]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getDeployProfile: () => ({}),
    getMetadata: async () => ({
      awsAccountId: '377024778620',
      supportedRuntimes: ['nodejs8.10', 'nodejs10.x', 'python2.7', 'python3.6', 'python3.7'],
      supportedRegions: [
        'us-east-1',
        'us-east-2',
        'us-west-2',
        'eu-central-1',
        'eu-west-1',
        'eu-west-2',
        'ap-northeast-1',
        'ap-southeast-1',
        'ap-southeast-2',
      ],
    }),
  },
  [require.resolve('@serverless/utils/config')]: {
    getLoggedInUser: () => ({}),
  },
  [require.resolve('@serverless/platform-client')]: {
    ServerlessSDK: class ServerlessSDK {
      async getOrgByName() {
        return { orgUid: 'foobar' };
      }
      async getProvidersByOrgServiceInstance() {
        return {};
      }
    },
  },
};

const awsRequestStubMap = {
  CloudFormation: {
    describeStacks: {
      Stacks: [{ Outputs: [{ OutputKey: 'ServiceEndpointFoo', OutputValue: 'https://' }] }],
    },
  },
};

describe('test', () => {
  describe('Pass', () => {
    let stdoutData;
    before(async () => {
      ({ stdoutData } = await runServerless({
        fixture: 'test-command',
        cliArgs: ['test'],
        modulesCacheStub,
        awsRequestStubMap,
      }));
    });

    it('should print summary', () => {
      expect(stdoutData).to.include('Test Results:');
      expect(stdoutData).to.include('3 passed');
      expect(stdoutData).to.include('0 failed');
    });
    it('should support specific endpoints', () =>
      expect(stdoutData).to.include('running - GET foo - endpoint'));
    it('should auto resolve endpoint', () =>
      expect(stdoutData).to.include('running - GET foo - function'));
    it('should auto resolve endpoint written with shorthand notation', () =>
      expect(stdoutData).to.include('running - GET bar - shorthand'));
  });

  describe('Failure', () => {
    let stdoutData;
    before(async () => {
      try {
        await runServerless({
          fixture: 'test-command',
          cliArgs: ['test'],
          modulesCacheStub: {
            ...modulesCacheStub,
            '@serverless/enterprise-plugin/lib/test/runTest': async (testSpec) => {
              if (testSpec.name === 'function') {
                throw Object.assign(new Error('Fail'), {
                  resp: { headers: {} },
                });
              }
            },
          },
          awsRequestStubMap,
        });
      } catch (error) {
        stdoutData = error.stdoutData;
        return;
      }
      throw new Error('Unexpected success');
    });

    it('should print summary', () => {
      expect(stdoutData).to.include('Test Results:');
      expect(stdoutData).to.include('2 passed');
      expect(stdoutData).to.include('1 failed');
    });
    it('should support specific endpoints', () =>
      expect(stdoutData).to.include('running - GET foo - endpoint'));
    it('should auto resolve endpoint', () =>
      expect(stdoutData).to.include('running - GET foo - function'));
    it('should auto resolve endpoint written with shorthand notation', () =>
      expect(stdoutData).to.include('running - GET bar - shorthand'));
  });
});
