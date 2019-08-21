'use strict';

const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const { configureDeployProfile } = require('./deployProfile');

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey')),
  getDeployProfile: jest.fn().mockReturnValue(
    Promise.resolve({
      secretValues: [{ secretName: 'name', secretProperties: { value: 'value' } }],
      safeguardsPolicies: [{ policy: 'name' }],
      providerCredentials: { secretValue: { accessKeyId: 'id', secretAccessKey: 'secret' } },
    })
  ),
}));

describe('configureDeployProfile', () => {
  it('gets creds & secrets then sets safeguards', async () => {
    const getStage = jest.fn().mockReturnValue('stage');
    const getRegion = jest.fn().mockReturnValue('region');
    const ctx = {
      provider: { getStage, getRegion },
      sls: {
        service: { app: 'app', tenant: 'tenant', service: 'service', provider: { name: 'aws' } },
      },
    };
    await configureDeployProfile(ctx);
    expect(ctx.safeguards).toEqual([{ policy: 'name' }]);
    expect(getAccessKeyForTenant).toBeCalledWith('tenant');
    expect(getDeployProfile).toBeCalledWith({
      accessKey: 'accessKey',
      app: 'app',
      tenant: 'tenant',
      service: 'service',
      stage: 'stage',
    });
    expect(ctx.provider.cachedCredentials).toEqual({
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      region: 'region',
    });
  });
});
