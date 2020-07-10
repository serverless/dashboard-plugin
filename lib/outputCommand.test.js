'use strict';

const { join } = require('path');
const sinon = require('sinon');
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
    getDeployProfile: () => ({}),
  },
};

describe('outputCommand', function () {
  this.timeout(1000 * 60 * 3);
  let serverlessPath;
  let getStateVariableStub;
  let getServiceStub;

  before(async () => {
    serverlessPath = (await setupServerless()).root;
    getServiceStub = sinon.stub().resolves({
      stagesAndRegions: {
        dev: {
          'us-east-1': {
            outputs: {
              stringOutputName: 'stringOutputValue',
              objectOutputName: { objectOutputPropName: 'objectOutputPropValue' },
              arrayOutputName: ['arrayOutputItem', 'item2'],
            },
          },
          'us-east-2': {
            outputs: {
              usEast2OutputName: 'usEast2OutputValue',
            },
          },
        },
        other: {
          'us-east-1': {
            outputs: {
              otherOutputName: 'otherOutputValue',
            },
          },
        },
      },
    });
    getStateVariableStub = sinon.stub().resolves({
      value: 'output-value',
    });
    modulesCacheStub[platformSdkPath].getStateVariable = getStateVariableStub;
    modulesCacheStub[platformSdkPath].getService = getServiceStub;
  });

  afterEach(() => sinon.resetHistory());

  describe('list', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['output', 'list'],
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
          cliArgs: ['output', 'list'],
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
          cliArgs: ['output', 'list', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_APP');
      }
    });
    it('Should crash when no service is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['output', 'list', '--org', 'some-org', '--app', 'some-app'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_SERVICE');
      }
    });
    it('Should support `--org` `--app` CLI params', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'list', '--org', 'some-org', '--app', 'some-app'],
        modulesCacheStub,
      });

      expect(getServiceStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        app: 'some-app',
        tenant: 'some-org',
        service: 'some-aws-service',
      });

      expect(stdoutData).to.include('stringOutputName');
      expect(stdoutData).to.include('stringOutputValue');
      expect(stdoutData).to.include('objectOutputName');
      expect(stdoutData).to.include('objectOutputPropName');
      expect(stdoutData).to.include('objectOutputPropValue');
      expect(stdoutData).to.include('arrayOutputName');
      expect(stdoutData).to.include('arrayOutputItem');
    });
    it('Should support `--service` CLI params', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: [
          'output',
          'list',
          '--org',
          'some-org',
          '--app',
          'some-app',
          '--service',
          'cli-service',
        ],
        modulesCacheStub,
      });

      expect(getServiceStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        app: 'some-app',
        tenant: 'some-org',
        service: 'cli-service',
      });

      expect(stdoutData).to.include('stringOutputName');
      expect(stdoutData).to.include('stringOutputValue');
      expect(stdoutData).to.include('objectOutputName');
      expect(stdoutData).to.include('objectOutputPropName');
      expect(stdoutData).to.include('objectOutputPropValue');
      expect(stdoutData).to.include('arrayOutputName');
      expect(stdoutData).to.include('arrayOutputItem');
    });

    it('Should support `--stage` CLI param', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'list', '--stage', 'other'],
        modulesCacheStub,
      });
      expect(getServiceStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
        service: 'some-aws-service',
      });

      expect(stdoutData).to.include('otherOutputName');
      expect(stdoutData).to.include('otherOutputName');
    });
    it('Should support `--region` CLI param', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'list', '--region', 'us-east-2'],
        modulesCacheStub,
      });
      expect(getServiceStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
        service: 'some-aws-service',
      });

      expect(stdoutData).to.include('usEast2OutputName');
      expect(stdoutData).to.include('usEast2OutputValue');
    });

    it('Should read configuration from config file', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'list'],
        modulesCacheStub,
      });
      expect(getServiceStub.args[0][0]).to.deep.equal({
        accessKey: 'access-key',
        service: 'some-aws-service',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
      });
      expect(stdoutData).to.include('stringOutputName');
      expect(stdoutData).to.include('stringOutputValue');
      expect(stdoutData).to.include('objectOutputName');
      expect(stdoutData).to.include('objectOutputPropName');
      expect(stdoutData).to.include('objectOutputPropValue');
      expect(stdoutData).to.include('arrayOutputName');
      expect(stdoutData).to.include('arrayOutputItem');
    });
  });

  describe('get', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: ['output', 'get', '--name', 'stringOutputName'],
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
          cliArgs: ['output', 'get', '--name', 'stringOutputName'],
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
          cliArgs: ['output', 'get', '--name', 'stringOutputName', '--org', 'some-org'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_APP');
      }
    });
    it('Should crash when no service is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: fixturesPath,
          cliArgs: [
            'output',
            'get',
            '--name',
            'stringOutputName',
            '--org',
            'some-org',
            '--app',
            'some-app',
          ],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_SERVICE');
      }
    });
    it('Should crash when no name is configured', async () => {
      try {
        await runServerless(serverlessPath, {
          cwd: awsMonitoredServicePath,
          cliArgs: ['output', 'get'],
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_OUTPUT_NAME');
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: [
          'output',
          'get',
          '--name',
          'stringOutputName',
          '--org',
          'some-org',
          '--app',
          'some-app',
        ],
        modulesCacheStub,
      });
      expect(getStateVariableStub.args[0][0]).to.deep.equal({
        outputName: 'stringOutputName',
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-app',
        tenant: 'some-org',
        service: 'some-aws-service',
        region: 'us-east-1',
      });
      expect(stdoutData).to.include('output-value');
    });
    it('Should support `--service` CLI params', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'get', '--name', 'stringOutputName', '--service', 'other-service'],
        modulesCacheStub,
      });
      expect(getStateVariableStub.args[0][0]).to.deep.equal({
        outputName: 'stringOutputName',
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
        service: 'other-service',
        region: 'us-east-1',
      });
      expect(stdoutData).to.include('output-value');
    });

    it('Should support `--stage` CLI param', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'get', '--name', 'stringOutputName', '--stage', 'foo'],
        modulesCacheStub,
      });
      expect(getStateVariableStub.args[0][0]).to.deep.equal({
        outputName: 'stringOutputName',
        accessKey: 'access-key',
        stage: 'foo',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
        service: 'some-aws-service',
        region: 'us-east-1',
      });
      expect(stdoutData).to.include('output-value');
    });

    it('Should support `--region` CLI param', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'get', '--name', 'stringOutputName', '--region', 'us-east-2'],
        modulesCacheStub,
      });
      expect(getStateVariableStub.args[0][0]).to.deep.equal({
        outputName: 'stringOutputName',
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
        service: 'some-aws-service',
        region: 'us-east-2',
      });
      expect(stdoutData).to.include('output-value');
    });

    it('Should read configuration from config file', async () => {
      const { stdoutData } = await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        cliArgs: ['output', 'get', '--name', 'stringOutputName'],
        modulesCacheStub,
      });
      expect(getStateVariableStub.args[0][0]).to.deep.equal({
        outputName: 'stringOutputName',
        accessKey: 'access-key',
        stage: 'dev',
        app: 'some-aws-service-app',
        tenant: 'testinteractivecli',
        service: 'some-aws-service',
        region: 'us-east-1',
      });
      expect(stdoutData).to.include('output-value');
    });
  });
});
