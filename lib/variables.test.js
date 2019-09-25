'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getStateVariable = sinon.stub().callsFake(({ outputName }) => {
  if (outputName === 'withsubkey') {
    return Promise.resolve({ value: { subkey: 'seeeeeccrreeeetttt' } });
  }
  return Promise.resolve({ value: 'simple seeeeeccrreeeetttt' });
});
const getDeployProfile = sinon.stub().resolves({
  secretValues: [
    {
      secretName: 'name',
      secretProperties: { value: 'secretValue' },
    },
  ],
});
const { getValueFromDashboardSecrets, getValueFromDashboardState } = proxyquire('./variables', {
  '@serverless/platform-sdk': {
    getAccessKeyForTenant: async () => 'accessKey',
    getStateVariable,
    getDeployProfile,
  },
});

describe('variables - getValueFromDashboardSecrets', () => {
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
    const value = await getValueFromDashboardSecrets(ctx)('param:name');
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
    const value = await getValueFromDashboardSecrets(ctx)('secrets:name');
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
    const value = await getValueFromDashboardSecrets({
      ...ctx,
      sls: {
        ...ctx.sls,
        processedInput: { commands: ['login'] },
      },
    })('secrets:name');
    expect(value).to.deep.equal({});
    expect(ctx.state.secretsUsed).to.deep.equal(new Set(['name']));
    expect(getDeployProfile.callCount).to.equal(0);
  });
});

describe('variables - getValueFromDashboardState', () => {
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
    const value = await getValueFromDashboardState(ctx)('state:service.name');
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

  it('doesnt break during login command', async () => {
    const value = await getValueFromDashboardState({
      ...ctx,
      sls: {
        ...ctx.sls,
        processedInput: { commands: ['login'] },
      },
    })('state:service.name');
    expect(value).to.deep.equal({});
    expect(getStateVariable.callCount).to.equal(0);
  });
});
