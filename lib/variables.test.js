'use strict';

const { expect } = require('chai');
const path = require('path');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');
const setupServerless = require('../test/setupServerless');

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
          getStateVariable: async ({
            variableName,
            appName,
            serviceName,
            stageName,
            regionName,
          }) => {
            if (variableName === 'sub') {
              return { value: { key: 'nested' } };
            }
            return {
              value:
                `name:${variableName}|app:${appName}|` +
                `service:${serviceName}|stage:${stageName}|region:${regionName}`,
            };
          },
        };
        this.deploymentProfiles = {
          get: async () => ({}),
        };
      }
      async getOrgByName() {
        return { orgUid: 'foobar' };
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
        };
      }
    },
  },
};

describe('lib/variables.test.js', () => {
  let configurationInput;

  before(async () => {
    ({
      serverless: { configurationInput },
    } = await runServerless({
      fixture: 'aws-monitored-service',
      command: 'print',
      configExt: {
        custom: {
          paramStageLocal: '${param:stageLocal}',
          paramDashboardInstance: '${param:dashboardInstance}',
          paramDefaultLocal: '${param:defaultLocal}',
          paramDashboardService: '${param:dashboardService}',
          output1: '${output:service.key}',
          output4: '${output:app:stage:region:service.key}',
          outputSubKey: '${output:service.sub.key}',
        },
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
      hooks: {
        beforeInstanceRun: async (serverless) => {
          const serverlessDir = (await setupServerless()).root;

          const resolveVariables = require(path.resolve(
            serverlessDir,
            'lib/configuration/variables'
          ));
          const { dashboardPlugin } = serverless.pluginManager;
          const variables = require('./variables');
          await resolveVariables({
            servicePath: serverless.serviceDir,
            configuration: serverless.configurationInput,
            options: {},
            sources: {
              param: { resolve: variables.paramResolve.bind(dashboardPlugin) },
              output: { resolve: variables.outputResolve.bind(dashboardPlugin) },
            },
          });
        },
      },
    }));
  });

  it('should resolve param source', async () => {
    expect(configurationInput.custom.paramStageLocal).to.equal('stageLocalValue');
    expect(configurationInput.custom.paramDashboardInstance).to.equal('dashboardInstanceValue');
    expect(configurationInput.custom.paramDefaultLocal).to.equal('defaultLocalValue');
    expect(configurationInput.custom.paramDashboardService).to.equal('dashboardServiceValue');
  });

  it('should resolve output source', async () => {
    expect(configurationInput.custom.output1).to.equal(
      'name:key|app:some-aws-service-app|service:service|stage:dev|region:us-east-1'
    );
    expect(configurationInput.custom.output4).to.equal(
      'name:key|app:app|service:service|stage:stage|region:region'
    );
    expect(configurationInput.custom.outputSubKey).to.equal('nested');
  });
});
