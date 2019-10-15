'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('variables', () => {
  let getStateVariable;
  let getDeployProfile;
  let getValueFromDashboardParams;
  let getValueFromDashboardOutputs;

  before(() => {
    getStateVariable = sinon.stub().callsFake(({ outputName }) => {
      if (outputName === 'withsubkey') {
        return Promise.resolve({ value: { subkey: 'seeeeeccrreeeetttt' } });
      }
      return Promise.resolve({ value: 'simple seeeeeccrreeeetttt' });
    });
    getDeployProfile = sinon.stub().resolves({
      secretValues: [
        {
          secretName: 'name',
          secretProperties: { value: 'secretValue' },
        },
      ],
    });
    ({ getValueFromDashboardParams, getValueFromDashboardOutputs } = proxyquire('./variables', {
      '@serverless/platform-sdk': {
        getAccessKeyForTenant: async () => 'accessKey',
        getStateVariable,
        getDeployProfile,
      },
    }));
  });

  describe('variables - getValueFromDashboardParams', () => {
    afterEach(() => {
      getDeployProfile.resetHistory();
    });

    const ctx = {
      sls: {
        service: {
          app: 'app',
          service: 'service',
          tenant: 'tenant',
        },
        processedInput: {
          commands: [],
        },
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
      expect(getDeployProfile.args[0]).to.deep.equal([
        {
          accessKey: 'accessKey',
          stage: 'stage',
          tenant: 'tenant',
          app: 'app',
          service: 'service',
        },
      ]);
    });

    it('gets a secret from dashboard', async () => {
      const value = await getValueFromDashboardParams(ctx)('secrets:name');
      expect(value).to.deep.equal('secretValue');
      expect(ctx.state.secretsUsed).to.deep.equal(new Set(['name']));
      expect(getDeployProfile.args[0]).to.deep.equal([
        {
          accessKey: 'accessKey',
          stage: 'stage',
          tenant: 'tenant',
          app: 'app',
          service: 'service',
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
      expect(getDeployProfile.callCount).to.equal(0);
    });
  });

  describe('variables - getValueFromDashboardOutputs', () => {
    afterEach(() => {
      getStateVariable.resetHistory();
    });
    const ctx = {
      sls: {
        service: {
          app: 'app',
          service: 'service',
          tenant: 'tenant',
        },
        processedInput: {
          commands: [],
        },
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
      expect(getStateVariable.args[0]).to.deep.equal([
        {
          accessKey: 'accessKey',
          stage: 'stage',
          tenant: 'tenant',
          app: 'app',
          service: 'service',
          outputName: 'name',
          region: 'region',
        },
      ]);
    });

    it('gets a state output from dashboard with long options but left blank', async () => {
      const value = await getValueFromDashboardOutputs(ctx)('state::::service.name');
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariable.args[0]).to.deep.equal([
        {
          accessKey: 'accessKey',
          stage: 'stage',
          tenant: 'tenant',
          app: 'app',
          service: 'service',
          outputName: 'name',
          region: 'region',
        },
      ]);
    });

    it('gets a state output from dashboard with long options but left only stage blank', async () => {
      const value = await getValueFromDashboardOutputs(ctx)(
        'state:diff-app::diff-region:service.name'
      );
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariable.args[0]).to.deep.equal([
        {
          accessKey: 'accessKey',
          stage: 'stage',
          tenant: 'tenant',
          app: 'diff-app',
          service: 'service',
          outputName: 'name',
          region: 'diff-region',
        },
      ]);
    });

    it('gets a state output from dashboard with app/stage/region options', async () => {
      const value = await getValueFromDashboardOutputs(ctx)(
        'state:diff-app:diff-stage:diff-region:service.name'
      );
      expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
      expect(getStateVariable.args[0]).to.deep.equal([
        {
          accessKey: 'accessKey',
          stage: 'diff-stage',
          tenant: 'tenant',
          app: 'diff-app',
          service: 'service',
          outputName: 'name',
          region: 'diff-region',
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
      expect(getStateVariable.callCount).to.equal(0);
    });
  });
});
