'use strict';

const sinon = require('sinon');
const runServerless = require('../test/run-serverless');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const platformClientPath = require.resolve('@serverless/platform-client');

const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getLoggedInUser: () => ({}),
  },
  [platformClientPath]: {
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
          cwd: process.cwd(),
          cliArgs: ['param', 'list'],
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
    it('Should crash when no org is configured', async () => {
      try {
        await runServerless({
          cwd: process.cwd(),
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
          cwd: process.cwd(),
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
        cwd: process.cwd(),
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
        cwd: process.cwd(),
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
  });

  describe('get', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless({
          cwd: process.cwd(),
          cliArgs: ['param', 'get', '--name', 'second-param-name'],
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
    it('Should crash when no org is configured', async () => {
      try {
        await runServerless({
          cwd: process.cwd(),
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
          cwd: process.cwd(),
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
          cwd: process.cwd(),
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
        cwd: process.cwd(),
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
        cwd: process.cwd(),
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
