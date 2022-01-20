'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

let providerCredentials = [];

describe('configureDeployProfile', () => {
  let deployProfileGetStub;
  let configureDeployProfile;
  before(() => {
    const ServerlessSDK = sinon
      .stub()
      .returns({ getProvidersByOrgServiceInstance: async () => providerCredentials });

    deployProfileGetStub = sinon.stub().resolves({
      secretValues: [{ secretName: 'name', secretProperties: { value: 'value' } }],
      providerCredentials: { secretValue: { accessKeyId: 'id', secretAccessKey: 'secret' } },
    });

    ({ configureDeployProfile } = proxyquire('./deployProfile', {
      '@serverless/platform-client': { ServerlessSDK },
      './client-utils': {
        getPlatformClientWithAccessKey: () => ({
          deploymentProfiles: {
            get: deployProfileGetStub,
          },
        }),
      },
    }));
  });

  it('gets creds & secrets', async () => {
    const getStage = () => 'stage';
    const getRegion = () => 'region';
    const ctx = {
      provider: { getStage, getRegion },
      sls: {
        cli: {
          // eslint-disable-next-line no-console
          log: (msg) => console.log(msg),
        },
        service: {
          app: 'app',
          org: 'org',
          orgUid: 'foobar',
          service: 'service',
          provider: { name: 'aws', variableSyntax: /\${([^{}:]+?(?:\(|:)(?:[^:{}][^{}]*?)?)}/ },
        },
        processedInput: { options: [] },
      },
    };
    await configureDeployProfile(ctx);
    expect(deployProfileGetStub.args[0][0]).to.deep.equal({
      appName: 'app',
      orgName: 'org',
      stageName: 'stage',
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
  });
});
