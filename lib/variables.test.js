'use strict';

const { expect } = require('chai');
const requireUncached = require('ncjsm/require-uncached');
const sinon = require('sinon');

describe('lib/variables.test.js', () => {
  let getStateVariableStub;
  let getDeployProfileStub;
  let getValueFromDashboardParams;
  let getValueFromDashboardOutputs;
  let resolveParams;

  before(() => {
    getStateVariableStub = sinon.stub().callsFake(({ outputName }) => {
      if (outputName === 'withsubkey') {
        return Promise.resolve({ value: { subkey: 'seeeeeccrreeeetttt' } });
      }
      return Promise.resolve({ value: 'simple seeeeeccrreeeetttt' });
    });
    getDeployProfileStub = sinon.stub().resolves({
      secretValues: [
        {
          secretName: 'name',
          secretProperties: { value: 'secretValue' },
        },
      ],
    });
    ({ getValueFromDashboardParams, getValueFromDashboardOutputs, resolveParams } = requireUncached(
      () => {
        Object.assign(require('@serverless/utils/config'), {
          getLoggedInUser: () => ({ accessKeys: { org: 'accesskey' } }),
        });
        Object.assign(require('@serverless/platform-client'), {
          ServerlessSDK: class ServerlessSDK {
            constructor() {
              this.services = {
                getStateVariable: getStateVariableStub,
              };

              this.deploymentProfiles = {
                get: getDeployProfileStub,
              };
            }

            async getOrgByName() {
              return { orgUid: 'abcd-1234' };
            }
            async getParamsByOrgServiceInstance() {
              return {};
            }
          },
        });
        return {
          ...require('./variables'),
          resolveParams: require('./resolveParams'),
        };
      }
    ));
  });

  describe('params', () => {
    afterEach(() => {
      getDeployProfileStub.resetHistory();
      resolveParams.clear();
    });

    const ctx = {
      sls: {
        service: {
          app: 'app',
          service: 'service',
          org: 'org',
        },
        processedInput: {
          commands: [],
          options: {
            cliOptions: [],
          },
        },
        enterpriseEnabled: true,
      },
      provider: {
        getStage: () => 'stage',
        getRegion: () => 'region',
      },
      state: { secretsUsed: new Set() },
    };

    it('gets a param from dashboard', async () => {
      const value = await getValueFromDashboardParams(ctx)('param:name');
      expect(value).to.deep.equal('secretValue');
      expect(ctx.state.secretsUsed).to.deep.equal(new Set(['name']));
      expect(getDeployProfileStub.args[0]).to.deep.equal([
        {
          stageName: 'stage',
          orgName: 'org',
          appName: 'app',
        },
      ]);
    });

    it('gets a secret from dashboard', async () => {
      const value = await getValueFromDashboardParams(ctx)('secrets:name');
      expect(value).to.deep.equal('secretValue');
      expect(ctx.state.secretsUsed).to.deep.equal(new Set(['name']));
      expect(getDeployProfileStub.args[0]).to.deep.equal([
        {
          stageName: 'stage',
          orgName: 'org',
          appName: 'app',
        },
      ]);
    });

    it('doesnt break during login command', async () => {
      const value = await getValueFromDashboardParams({
        ...ctx,
        sls: {
          ...ctx.sls,
          processedInput: { commands: ['login'] },
        },
      })('secrets:name');
      expect(value).to.deep.equal('');
      expect(ctx.state.secretsUsed).to.deep.equal(new Set(['name']));
      expect(getDeployProfileStub.callCount).to.equal(0);
    });
  });

  describe('outputs', () => {
    afterEach(() => {
      getStateVariableStub.resetHistory();
    });
    const ctx = {
      sls: {
        service: {
          app: 'app',
          service: 'service',
          org: 'org',
        },
        processedInput: {
          commands: [],
        },
        enterpriseEnabled: true,
      },
      provider: {
        getStage: () => 'stage',
        getRegion: () => 'region',
      },
      state: { secretsUsed: new Set() },
    };

    it('gets a state output from dashboard', async () => {
      const value = await getValueFromDashboardOutputs(ctx)('state:service.name');
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariableStub.args[0]).to.deep.equal([
        {
          stageName: 'stage',
          orgName: 'org',
          appName: 'app',
          serviceName: 'service',
          variableName: 'name',
          regionName: 'region',
        },
      ]);
    });

    it('gets a state output from dashboard with long options but left blank', async () => {
      const value = await getValueFromDashboardOutputs(ctx)('state::::service.name');
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariableStub.args[0]).to.deep.equal([
        {
          stageName: 'stage',
          orgName: 'org',
          appName: 'app',
          serviceName: 'service',
          variableName: 'name',
          regionName: 'region',
        },
      ]);
    });

    it('gets a state output from dashboard with long options but left only stage blank', async () => {
      const value = await getValueFromDashboardOutputs(ctx)(
        'state:diff-app::diff-region:service.name'
      );
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariableStub.args[0]).to.deep.equal([
        {
          stageName: 'stage',
          orgName: 'org',
          appName: 'diff-app',
          serviceName: 'service',
          variableName: 'name',
          regionName: 'diff-region',
        },
      ]);
    });

    it('gets a state output from dashboard with app/stage/region options', async () => {
      const value = await getValueFromDashboardOutputs(ctx)(
        'state:diff-app:diff-stage:diff-region:service.name'
      );
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariableStub.args[0]).to.deep.equal([
        {
          stageName: 'diff-stage',
          orgName: 'org',
          appName: 'diff-app',
          serviceName: 'service',
          variableName: 'name',
          regionName: 'diff-region',
        },
      ]);
    });

    it('doesnt break during login command', async () => {
      const value = await getValueFromDashboardOutputs({
        ...ctx,
        sls: {
          ...ctx.sls,
          processedInput: { commands: ['login'] },
        },
      })('state:service.name');
      expect(value).to.deep.equal('');
      expect(getStateVariableStub.callCount).to.equal(0);
    });
  });
});
