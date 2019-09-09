'use strict';

const { getValueFromDashboardSecrets, getValueFromDashboardState } = require('./variables');
const { getStateVariable, getDeployProfile } = require('@serverless/platform-sdk');

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey')),
  getDeployProfile: jest.fn().mockReturnValue(
    Promise.resolve({
      secretValues: [
        {
          secretName: 'name',
          secretProperties: { value: 'secretValue' },
        },
      ],
    })
  ),
  getStateVariable: jest.fn().mockImplementation(({ outputName }) => {
    if (outputName === 'withsubkey') {
      return Promise.resolve({ value: { subkey: 'seeeeeccrreeeetttt' } });
    }
    return Promise.resolve({ value: 'simple seeeeeccrreeeetttt' });
  }),
}));

afterEach(() => {
  getDeployProfile.mockClear();
  getStateVariable.mockClear();
});

describe('variables - getValueFromDashboardSecrets', () => {
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
      getStage: jest.fn().mockReturnValue('stage'),
      getRegion: jest.fn().mockReturnValue('region'),
    },
    state: { secretsUsed: new Set() },
  };

  it('gets a secret from dashboard', async () => {
    const value = await getValueFromDashboardSecrets(ctx)('secrets:name');
    expect(value).to.deep.equal('secretValue');
    expect(ctx.state.secretsUsed).to.deep.equal(new Set(['name']));
    expect(getDeployProfile).toBeCalledWith({
      accessKey: 'accessKey',
      stage: 'stage',
      tenant: 'tenant',
      app: 'app',
      service: 'service',
    });
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
    expect(getDeployProfile).toHaveBeenCalledTimes(0);
  });
});

describe('variables - getValueFromDashboardState', () => {
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
      getStage: jest.fn().mockReturnValue('stage'),
      getRegion: jest.fn().mockReturnValue('region'),
    },
    state: { secretsUsed: new Set() },
  };

  it('gets a state output from dashboard', async () => {
    const value = await getValueFromDashboardState(ctx)('state:service.name');
    expect(value).to.deep.equal('simple seeeeeccrreeeetttt');
    expect(getStateVariable).toBeCalledWith({
      accessKey: 'accessKey',
      stage: 'stage',
      tenant: 'tenant',
      app: 'app',
      service: 'service',
      outputName: 'name',
      region: 'region',
    });
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
    expect(getStateVariable).toHaveBeenCalledTimes(0);
  });
});
