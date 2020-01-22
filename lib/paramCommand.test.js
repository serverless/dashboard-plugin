'use strict';

const { join } = require('path');
const sinon = require('sinon');
const overrideStdoutWrite = require('process-utils/override-stdout-write');
const runServerless = require('@serverless/test/run-serverless');

const setupServerless = require('../test/setupServerless');

const fixturesPath = join(__dirname, '../test/fixtures');
const awsMonitoredServicePath = join(fixturesPath, 'aws-monitored-service');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const modulesCacheStub = {
  [platformSdkPath]: {
    configureFetchDefaults: () => {},
    getAccessKeyForTenant: () => 'access-key',
    getLoggedInUser: () => ({}),
  },
};

describe('paramCommand', function() {
  this.timeout(1000 * 60 * 3);

  let serverlessPath;
  let deployProfileStub;

  before(async () => {
    serverlessPath = (await setupServerless()).root;
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
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
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
        expect(error.code).to.equal('DASHBOARD_LOGGED_OUT');
      }
    });
    it('Should crash when no org is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['param', 'list'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_ORG');
      }
    });
    it('Should crash when no app is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['param', 'list', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_APP');
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      let stdOutput = '';
      await overrideStdoutWrite(
        data => (stdOutput += data),
        () =>
          runServerless(serverlessPath, {
            cwd: fixturesPath,
            cliArgs: ['param', 'list', '--org', 'some-org', '--app', 'some-app'],
            modulesCacheStub,
          })
      );
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdOutput).to.include('first-param-name');
      expect(stdOutput).to.include('first-param-value');
      expect(stdOutput).to.include('second-param-name');
      expect(stdOutput).to.include('second-param-value');
    });

    it('Should support `--stage` CLI param', async () => {
      let stdOutput = '';
      await overrideStdoutWrite(
        data => (stdOutput += data),
        () =>
          runServerless(serverlessPath, {
            cwd: fixturesPath,
            cliArgs: ['param', 'list', '--org', 'some-org', '--app', 'some-app', '--stage', 'foo'],
            modulesCacheStub,
          })
      );
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'foo',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdOutput).to.include('first-param-name');
      expect(stdOutput).to.include('first-param-value');
      expect(stdOutput).to.include('second-param-name');
      expect(stdOutput).to.include('second-param-value');
    });
    it('Should read configuration from config file', async () => {
      let stdOutput = '';
      await overrideStdoutWrite(
        data => (stdOutput += data),
        () =>
          runServerless(serverlessPath, {
            cwd: awsMonitoredServicePath,
            cliArgs: ['param', 'list'],
            modulesCacheStub,
          })
      );
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
      });
      expect(stdOutput).to.include('first-param-name');
      expect(stdOutput).to.include('first-param-value');
      expect(stdOutput).to.include('second-param-name');
      expect(stdOutput).to.include('second-param-value');
    });
  });

  describe('get', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
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
        expect(error.code).to.equal('DASHBOARD_LOGGED_OUT');
      }
    });
    it('Should crash when no org is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['param', 'get', '--name', 'second-param-name'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_ORG');
      }
    });
    it('Should crash when no app is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['param', 'get', '--name', 'second-param-name', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_APP');
      }
    });
    it('Should crash when no name is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['param', 'get', '--app', 'some-app', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_PARAM_NAME');
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      let stdOutput = '';
      await overrideStdoutWrite(
        data => (stdOutput += data),
        () =>
          runServerless(serverlessPath, {
            cwd: fixturesPath,
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
          })
      );
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdOutput).to.not.include('first-param-name');
      expect(stdOutput).to.not.include('first-param-value');
      expect(stdOutput).to.include('second-param-value');
    });

    it('Should support `--stage` CLI param', async () => {
      let stdOutput = '';
      await overrideStdoutWrite(
        data => (stdOutput += data),
        () =>
          runServerless(serverlessPath, {
            cwd: fixturesPath,
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
          })
      );
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'foo',
        app: 'some-app',
        tenant: 'some-org',
      });
      expect(stdOutput).to.not.include('first-param-name');
      expect(stdOutput).to.not.include('first-param-value');
      expect(stdOutput).to.include('second-param-value');
    });
    it('Should read configuration from config file', async () => {
      let stdOutput = '';
      await overrideStdoutWrite(
        data => (stdOutput += data),
        () =>
          runServerless(serverlessPath, {
            cwd: awsMonitoredServicePath,
            cliArgs: ['param', 'get', '--name', 'second-param-name'],
            modulesCacheStub,
          })
      );
      expect(deployProfileStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
      });
      expect(stdOutput).to.not.include('first-param-name');
      expect(stdOutput).to.not.include('first-param-value');
      expect(stdOutput).to.include('second-param-value');
    });
  });
});
