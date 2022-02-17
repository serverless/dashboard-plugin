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
              paramName: 'stageLocal',
              paramValue: 'unexpectedDashboardInstance',
              paramType: 'instances',
            },
            {
              paramName: 'dashboardInstance',
              paramValue: 'dashboardInstanceValue',
              paramType: 'instances',
            },
            {
              paramName: 'defaultLocal',
              paramValue: 'unexpectedDashboardService',
              paramType: 'services',
            },
            {
              paramName: 'dashboardService',
              paramValue: 'dashboardServiceValue',
              paramType: 'services',
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
    it('Should support `--org` and `--app` CLI params', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param list',
        options: { org: 'some-org', app: 'some-app', service: 'some-service' },
        modulesCacheStub,
      });
      expect(output).to.include('dashboardInstance');
      expect(output).to.include('dashboardInstanceValue');
      expect(output).to.include('dashboardService');
      expect(output).to.include('dashboardServiceValue');
    });

    it('Should support `--stage` CLI param', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param list',
        options: { org: 'some-org', app: 'some-app', service: 'some-service', stage: 'foo' },
        modulesCacheStub,
      });

      expect(output).to.include('dashboardInstance');
      expect(output).to.include('dashboardInstanceValue');
      expect(output).to.include('dashboardService');
      expect(output).to.include('dashboardServiceValue');
    });
    it('Should read configuration from config file', async () => {
      const { output } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'param list',
        configExt: {
          params: {
            default: {
              defaultLocal: 'defaultLocalValue',
              stageLocal: 'unexpectedDefaultLocal',
              dashboardInstance: 'unexpectedDefaultLocal',
            },
            dev: {
              stageLocal: 'stageLocalValue',
            },
          },
        },
        modulesCacheStub,
      });
      expect(output).to.include('stageLocal');
      expect(output).to.include('stageLocalValue');
      expect(output).to.include('dashboardInstance');
      expect(output).to.include('dashboardInstanceValue');
      expect(output).to.include('defaultLocal');
      expect(output).to.include('defaultLocalValue');
      expect(output).to.include('dashboardService');
      expect(output).to.include('dashboardServiceValue');
    });

    it('Should support overriding with `--param` CLI param', async () => {
      const { output } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'param list',
        configExt: {
          params: {
            default: {
              defaultLocal: 'defaultLocalValue',
              stageLocal: 'unexpectedDefaultLocal',
              dashboardInstance: 'unexpectedDefaultLocal',
            },
            dev: {
              stageLocal: 'stageLocalValue',
            },
          },
        },
        options: {
          param: ['dashboardInstance=overridenbycli'],
        },
        modulesCacheStub,
      });
      expect(output).to.include('stageLocal');
      expect(output).to.include('stageLocalValue');
      expect(output).to.include('dashboardInstance');
      expect(output).to.include('overridenbycli');
      expect(output).to.include('defaultLocal');
      expect(output).to.include('defaultLocalValue');
      expect(output).to.include('dashboardService');
      expect(output).to.include('dashboardServiceValue');
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
    it('Should crash when no name is configured', async () => {
      try {
        await runServerless({
          noService: true,
          command: 'param get',
          options: { app: 'some-app', org: 'some-org', service: 'some-service' },
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
        options: {
          name: 'dashboardInstance',
          org: 'some-org',
          app: 'some-app',
          service: 'some-service',
        },
        modulesCacheStub,
      });

      expect(output).to.include('dashboardInstanceValue');
    });

    it('Should support `--stage` CLI param', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param get',
        options: {
          name: 'dashboardInstance',
          org: 'some-org',
          app: 'some-app',
          stage: 'foo',
          service: 'some-service',
        },
        modulesCacheStub,
      });

      expect(output).to.include('dashboardInstanceValue');
    });
    it('Should read configuration from config file', async () => {
      const { output } = await runServerless({
        fixture: 'aws-monitored-service',
        command: 'param get',
        options: { name: 'stageLocal' },
        configExt: {
          params: {
            dev: {
              stageLocal: 'stageLocalValue',
            },
          },
        },
        modulesCacheStub,
      });

      expect(output).to.include('stageLocalValue');
    });
    it('Should support overriding with `--param` CLI param', async () => {
      const { output } = await runServerless({
        noService: true,
        command: 'param get',
        options: {
          name: 'dashboardInstance',
          org: 'some-org',
          app: 'some-app',
          stage: 'foo',
          service: 'some-service',
          param: ['dashboardInstance=overridenbycli'],
        },
        modulesCacheStub,
      });

      expect(output).to.include('overridenbycli');
    });
  });
});
