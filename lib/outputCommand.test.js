'use strict';

const chai = require('chai');
const sinon = require('sinon');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

chai.use(require('chai-as-promised'));

const { expect } = chai;

const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => ({
      accessKeys: { 'some-org': 'accesskey', 'testinteractivecli': 'accesskey' },
    }),
  },
  [platformClientPath]: {
    ServerlessSDK: class ServerlessSDK {
      constructor() {
        this.services = {
          get: async () => ({
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
          }),
          getStateVariable: async () => ({
            value: 'output-value',
          }),
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

describe('outputCommand', () => {
  afterEach(() => sinon.resetHistory());

  describe('list', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'output list',
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
          command: 'output list',
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
          command: 'output list',
          options: { org: 'some-org' },
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_APP') throw error;
      }
    });
    it('Should crash when no service is configured', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'output list',
          options: { org: 'some-org', app: 'some-app' },
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_SERVICE') throw error;
      }
    });
    it('Should support `--org` `--app` CLI params', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output list',
        options: { org: 'some-org', app: 'some-app' },
        modulesCacheStub,
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
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output list',
        options: { org: 'some-org', app: 'some-app', service: 'cli-service' },
        modulesCacheStub,
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
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output list',
        options: { stage: 'other' },
        modulesCacheStub,
      });

      expect(stdoutData).to.include('otherOutputName');
      expect(stdoutData).to.include('otherOutputName');
    });
    it('Should support `--region` CLI param', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output list',
        options: { region: 'us-east-2' },
        modulesCacheStub,
      });

      expect(stdoutData).to.include('usEast2OutputName');
      expect(stdoutData).to.include('usEast2OutputValue');
    });

    it('Should read configuration from config file', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output list',
        modulesCacheStub,
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
        await runServerless({
          fixture: 'aws-monitored-service',
          command: 'output get',
          options: { name: 'stringOutputName' },
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
          command: 'output get',
          options: { name: 'stringOutputName' },
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
          command: 'output get',
          options: { name: 'stringOutputName', org: 'some-org' },
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        expect(error.code).to.equal('DASHBOARD_MISSING_APP');
      }
    });
    it('Should crash when no service is configured', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'output get',
          options: { name: 'stringOutputName', org: 'some-org', app: 'some-app' },
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_SERVICE') throw error;
      }
    });
    it('Should crash when no name is configured', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'output get',
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        try {
          expect(error).to.have.property('code', 'MISSING_REQUIRED_CLI_OPTION');
        } catch {
          expect(error).to.have.property('code', 'DASHBOARD_MISSING_OUTPUT_NAME');
        }
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output get',
        options: { name: 'stringOutputName', org: 'some-org', app: 'some-app' },
        modulesCacheStub,
      });
      expect(stdoutData).to.include('output-value');
    });
    it('Should support `--service` CLI params', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output get',
        options: { name: 'stringOutputName', service: 'other-service' },
        modulesCacheStub,
      });
      expect(stdoutData).to.include('output-value');
    });

    it('Should support `--stage` CLI param', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output get',
        options: { name: 'stringOutputName', stage: 'foo' },
        modulesCacheStub,
      });
      expect(stdoutData).to.include('output-value');
    });

    it('Should support `--region` CLI param', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output get',
        options: { name: 'stringOutputName', region: 'us-east-2' },
        modulesCacheStub,
      });
      expect(stdoutData).to.include('output-value');
    });

    it('Should read configuration from config file', async () => {
      const { stdoutData } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'output get',
        options: { name: 'stringOutputName' },
        modulesCacheStub,
      });
      expect(stdoutData).to.include('output-value');
    });
  });
});
