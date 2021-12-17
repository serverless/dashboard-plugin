'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

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
        this.deploymentProfiles = {
          get: async () => ({}),
        };
      }

      async getOrgByName() {
        return { orgUid: 'foobar' };
      }

      async getProvidersByOrgServiceInstance() {
        return { result: [], metadata: {}, errors: [] };
      }

      async getParamsByOrgServiceInstance() {
        return {
          result: [
            {
              paramName: 'first-param-name',
              paramValue: 'first-param-value',
              paramType: 'instances',
            },
            {
              paramName: 'second-param-name',
              paramValue: 'second-param-value',
              paramType: 'instances',
            },
          ],
          metadata: {},
          errors: [],
        };
      }
    },
  },
};

describe('paramCommand', () => {
  afterEach(() => sinon.resetHistory());

  describe('list', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'param list',
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
          command: 'param list',
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
          command: 'param list',
          options: { org: 'some-org' },
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        if (error.code !== 'DASHBOARD_MISSING_APP') throw error;
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param list',
        options: { org: 'some-org', app: 'some-app' },
        modulesCacheStub,
      });
      expect(output).to.include('first-param-name');
      expect(output).to.include('first-param-value');
      expect(output).to.include('second-param-name');
      expect(output).to.include('second-param-value');
    });

    it('Should support `--stage` CLI param', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param list',
        options: { org: 'some-org', app: 'some-app', stage: 'foo' },
        modulesCacheStub,
      });

      expect(output).to.include('first-param-name');
      expect(output).to.include('first-param-value');
      expect(output).to.include('second-param-name');
      expect(output).to.include('second-param-value');
    });
    it('Should read configuration from config file', async () => {
      const { output } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'param list',
        modulesCacheStub,
      });

      expect(output).to.include('first-param-name');
      expect(output).to.include('first-param-value');
      expect(output).to.include('second-param-name');
      expect(output).to.include('second-param-value');
    });

    it('Should support `--service` and --region CLI param to talk to Parameters backend', async () => {
      const getParamsStub = sinon.stub().returns({
        result: [
          {
            paramName: 'paramServiceOne',
            paramValue: 'paramServiceValueOne',
            paramType: 'instances',
          },
          {
            paramName: 'paramServiceTwo',
            paramValue: 'paramServiceValueTwo',
            paramType: 'instances',
          },
        ],
      });
      const { output } = await runServerless({
        noService: true,
        command: 'param list',
        options: {
          org: 'some-org',
          app: 'some-app',
          stage: 'foo',
          service: 'some-service',
          region: 'us-east-1',
        },

        modulesCacheStub: {
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
      expect(output).to.include('paramServiceOne');
      expect(output).to.include('paramServiceValueOne');
      expect(output).to.include('paramServiceTwo');
      expect(output).to.include('paramServiceValueTwo');
    });
  });

  describe('get', () => {
    it('Should crash when not logged in', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'param get',
          options: { name: 'second-param-name' },
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
          command: 'param get',
          options: { name: 'second-param-name' },
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
          command: 'param get',
          options: { name: 'second-param-name', org: 'some-org' },
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
          command: 'param get',
          options: { app: 'some-app', org: 'some-org' },
          modulesCacheStub,
        });
        throw new Error('Unexpected');
      } catch (error) {
        try {
          expect(error).to.have.property('code', 'MISSING_REQUIRED_CLI_OPTION');
        } catch {
          expect(error).to.have.property('code', 'DASHBOARD_MISSING_PARAM_NAME');
        }
      }
    });
    it('Should support `--org` and `--app` CLI params', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param get',
        options: { name: 'second-param-name', org: 'some-org', app: 'some-app' },
        modulesCacheStub,
      });

      expect(output).to.not.include('first-param-name');
      expect(output).to.not.include('first-param-value');
      expect(output).to.include('second-param-value');
    });

    it('Should support `--stage` CLI param', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param get',
        options: { name: 'second-param-name', org: 'some-org', app: 'some-app', stage: 'foo' },
        modulesCacheStub,
      });

      expect(output).to.not.include('first-param-name');
      expect(output).to.not.include('first-param-value');
      expect(output).to.include('second-param-value');
    });
    it('Should read configuration from config file', async () => {
      const { output } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'param get',
        options: { name: 'second-param-name' },
        modulesCacheStub,
      });

      expect(output).to.not.include('first-param-name');
      expect(output).to.not.include('first-param-value');
      expect(output).to.include('second-param-value');
    });
  });
});
