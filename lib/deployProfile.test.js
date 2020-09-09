'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getAccessKeyForTenant = sinon.stub().resolves('accessKey');
let providerCredentials = [];
const ServerlessSDK = sinon
  .stub()
  .returns({ getProvidersByOrgServiceInstance: async () => Promise.resolve(providerCredentials) });
const getDeployProfile = sinon.stub().resolves({
  secretValues: [{ secretName: 'name', secretProperties: { value: 'value' } }],
  safeguardsPolicies: [{ policy: 'name' }],
  providerCredentials: { secretValue: { accessKeyId: 'id', secretAccessKey: 'secret' } },
});
const { configureDeployProfile } = proxyquire('./deployProfile', {
  '@serverless/platform-sdk': { getAccessKeyForTenant, getDeployProfile },
  '@serverless/platform-client': { ServerlessSDK },
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
      stage: 'stage',
    });
    expect(ctx.provider.cachedCredentials).to.deep.equal({
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      region: 'region',
    });
  });
  describe('overriding with providers', () => {
    before(() => {
      providerCredentials = {
        result: [
          {
            providerName: 'aws',
            providerType: 'roleArn',
            providerDetails: {
              accessKeyId: 'providerId',
              secretAccessKey: 'providerSecret',
              sessionToken: 'tempSessionToken',
            },
          },
        ],
      };
    });
    it('overrides creds with providers', async () => {
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
        stage: 'stage',
      });
      expect(ctx.provider.cachedCredentials).to.deep.equal({
        accessKeyId: 'providerId',
        secretAccessKey: 'providerSecret',
        sessionToken: 'tempSessionToken',
        region: 'region',
      });
    });
  });
});
