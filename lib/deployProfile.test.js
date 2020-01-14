'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getAccessKeyForTenant = sinon.stub().resolves('accessKey');
const getDeployProfile = sinon.stub().resolves({
  secretValues: [{ secretName: 'name', secretProperties: { value: 'value' } }],
  safeguardsPolicies: [{ policy: 'name' }],
  providerCredentials: { secretValue: { accessKeyId: 'id', secretAccessKey: 'secret' } },
});
const { configureDeployProfile } = proxyquire('./deployProfile', {
  '@serverless/platform-sdk': { getAccessKeyForTenant, getDeployProfile },
});

describe('configureDeployProfile', () => {
  it('gets creds & secrets then sets safeguards', async () => {
    const getStage = () => 'stage';
    const getRegion = () => 'region';
    const ctx = {
      provider: { getStage, getRegion },
      sls: {
        service: { app: 'app', org: 'org', service: 'service', provider: { name: 'aws' } },
      },
    };
    await configureDeployProfile(ctx);
    expect(ctx.safeguards).to.deep.equal([{ policy: 'name' }]);
    expect(getAccessKeyForTenant.args[0][0]).to.equal('org');
    expect(getDeployProfile.args[0][0]).to.deep.equal({
      accessKey: 'accessKey',
      app: 'app',
      tenant: 'org',
      service: 'service',
      stage: 'stage',
    });
    expect(ctx.provider.cachedCredentials).to.deep.equal({
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      region: 'region',
    });
  });
});
