'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
  },
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => ({}),
  },
  [platformClientPath]: {
    ServerlessSDK: class ServerlessSDK {
      async getOrgByName() {
        return { orgUid: 'foobar' };
      }

      async getProvidersByOrgServiceInstance() {
        return { result: [], metadata: {}, errors: [] };
      }

      async getParamsByOrgServiceInstance() {
        return { result: [], metadata: {}, errors: [] };
      }
    },
  },
};

describe('paramCommand', function () {
  this.timeout(1000 * 60 * 3);

  let deployProfileStub;

  before(async () => {
    deployProfileStub = sinon.stub().resolves({
      secretValues: [
        { secretName: 'first-param-name', secretProperties: { value: 'first-param-value' } },
        { secretName: 'second-param-name', secretProperties: { value: 'second-param-value' } },
      ],
    });
    modulesCacheStub[platformSdkPath].getDeployProfile = deployProfileStub;
  });

  afterEach(() => sinon.resetHistory());

  describe('list', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'list'],
          modulesCacheStub: {
            ...modulesCacheStub,
            [configUtilsPath]: {
              ...configUtils,
              getLoggedInUser: () => null,
            },
          },
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_LOGGED_OUT') throw error;
      }
    });
    it('Should crash when no org is configured', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'list'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_ORG') throw error;
      }
    });
    it('Should crash when no app is configured', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'list', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_APP') throw error;
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      const { stdoutData } = await runServerless({
        noService: true,
        cliArgs: ['param', 'list', '--org', 'some-org', '--app', 'some-app'],
        modulesCacheStub,
      });
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdoutData).to.include('first-param-name');
      expect(stdoutData).to.include('first-param-value');
      expect(stdoutData).to.include('second-param-name');
      expect(stdoutData).to.include('second-param-value');
    });

    it('Should support `--stage` CLI param', async () => {
      const { stdoutData } = await runServerless({
        noService: true,
        cliArgs: ['param', 'list', '--org', 'some-org', '--app', 'some-app', '--stage', 'foo'],
        modulesCacheStub,
      });

      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'foo',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdoutData).to.include('first-param-name');
      expect(stdoutData).to.include('first-param-value');
      expect(stdoutData).to.include('second-param-name');
      expect(stdoutData).to.include('second-param-value');
    });
    it('Should read configuration from config file', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        cliArgs: ['param', 'list'],
        modulesCacheStub,
      });

      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
      });
      expect(stdoutData).to.include('first-param-name');
      expect(stdoutData).to.include('first-param-value');
      expect(stdoutData).to.include('second-param-name');
      expect(stdoutData).to.include('second-param-value');
    });

    it('Should support `--service` and --region CLI param to talk to Parameters backend', async () => {
      const getParamsStub = sinon.stub().returns({
        result: [
          { paramName: 'paramServiceOne', paramValue: 'paramServiceValueOne' },
          { paramName: 'paramServiceTwo', paramValue: 'paramServiceValueTwo' },
        ],
      });
      const { stdoutData } = await runServerless({
        noService: true,
        cliArgs: [
          'param',
          'list',
          '--org',
          'some-org',
          '--app',
          'some-app',
          '--stage',
          'foo',
          '--service',
          'some-service',
          '--region',
          'us-east-1',
        ],
        modulesCacheStub: {
          [platformSdkPath]: {
            ...modulesCacheStub[platformSdkPath],
          },
          [configUtilsPath]: {
            ...modulesCacheStub[configUtilsPath],
          },
          [platformClientPath]: {
            ServerlessSDK: class ServerlessSDK {
              async getParamsByOrgServiceInstance(orgUid, serviceSlug, instanceSlug) {
                return getParamsStub(orgUid, serviceSlug, instanceSlug);
              }
              async getOrgByName() {
                return { orgUid: 'orgUid' };
              }
            },
          },
        },
      });
      expect(getParamsStub.args[0]).to.deep.equal([
        'orgUid',
        'appName|some-app|serviceName|some-service',
        'appName|some-app|serviceName|some-service|stage|foo|region|us-east-1',
      ]);
      expect(stdoutData).to.include('paramServiceOne');
      expect(stdoutData).to.include('paramServiceValueOne');
      expect(stdoutData).to.include('paramServiceTwo');
      expect(stdoutData).to.include('paramServiceValueTwo');
    });
  });

  describe('get', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'get', '--name', 'second-param-name'],
          modulesCacheStub: {
            ...modulesCacheStub,
            [configUtilsPath]: {
              ...configUtils,
              getLoggedInUser: () => null,
            },
          },
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_LOGGED_OUT') throw error;
      }
    });
    it('Should crash when no org is configured', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'get', '--name', 'second-param-name'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_ORG') throw error;
      }
    });
    it('Should crash when no app is configured', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'get', '--name', 'second-param-name', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_APP') throw error;
      }
    });
    it('Should crash when no name is configured', async () => {
      try {
        await runServerless({
          noService: true,
          cliArgs: ['param', 'get', '--app', 'some-app', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_PARAM_NAME') throw error;
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      const { stdoutData } = await runServerless({
        noService: true,
        cliArgs: [
          'param',
          'get',
          '--name',
          'second-param-name',
          '--org',
          'some-org',
          '--app',
          'some-app',
        ],
        modulesCacheStub,
      });

      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdoutData).to.not.include('first-param-name');
      expect(stdoutData).to.not.include('first-param-value');
      expect(stdoutData).to.include('second-param-value');
    });

    it('Should support `--stage` CLI param', async () => {
      const { stdoutData } = await runServerless({
        noService: true,
        cliArgs: [
          'param',
          'get',
          '--name',
          'second-param-name',
          '--org',
          'some-org',
          '--app',
          'some-app',
          '--stage',
          'foo',
        ],
        modulesCacheStub,
      });

      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'foo',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdoutData).to.not.include('first-param-name');
      expect(stdoutData).to.not.include('first-param-value');
      expect(stdoutData).to.include('second-param-value');
    });
    it('Should read configuration from config file', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        cliArgs: ['param', 'get', '--name', 'second-param-name'],
        modulesCacheStub,
      });

      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
      });
      expect(stdoutData).to.not.include('first-param-name');
      expect(stdoutData).to.not.include('first-param-value');
      expect(stdoutData).to.include('second-param-value');
    });
  });
});
