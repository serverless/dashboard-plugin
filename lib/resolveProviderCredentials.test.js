'use strict';

const chai = require('chai');
const proxyquire = require('proxyquire');

chai.use(require('chai-as-promised'));

const expect = chai.expect;

const mockedSdk = {
  organizations: {
    get: () => {
      return {
        orgUid: 'org-uid',
      };
    },
  },
  getProvidersByOrgServiceInstance: async () => {
    return {
      result: [
        {
          alias: 'someprovider',
          providerName: 'aws',
          providerType: 'roleArn',
          providerUid: 'provideruid',
          isDefault: true,
          providerDetails: {
            roleArn: 'arn:xxx',
            accessKeyId: 'someaccesskeyid',
            secretAccessKey: 'somesecret',
            sessionToken: 'sessiontoken',
          },
        },
      ],
    };
  },
};

describe('lib/resolveProviderCredentials.test.js', () => {
  const org = 'testorg';
  const service = 'testservice';
  const app = 'testapp';
  const stage = 'dev';
  const region = 'us-east-1';

  it('resolves to null if no providers found', async () => {
    const resolveProviderCredentials = proxyquire('./resolveProviderCredentials', {
      './clientUtils': {
        getPlatformClientWithAccessKey: async () => ({
          ...mockedSdk,
          getProvidersByOrgServiceInstance: async () => {
            return {
              result: [],
            };
          },
        }),
      },
    });
    const result = await resolveProviderCredentials({
      configuration: {
        org,
        app,
        service,
      },
      region,
      stage,
    });
    expect(result).to.be.null;
  });

  it('resolves to null org was not found', async () => {
    const resolveProviderCredentials = proxyquire('./resolveProviderCredentials', {
      './clientUtils': {
        getPlatformClientWithAccessKey: async () => ({
          organizations: {
            get: async () => {
              const err = new Error('Not found');
              err.statusCode = 404;
              throw err;
            },
          },
        }),
      },
    });
    const result = await resolveProviderCredentials({
      configuration: {
        org,
        app,
        service,
      },
      region,
      stage,
    });
    expect(result).to.be.null;
  });

  it('succesfully resolves credentials', async () => {
    const resolveProviderCredentials = proxyquire('./resolveProviderCredentials', {
      './clientUtils': {
        getPlatformClientWithAccessKey: async () => mockedSdk,
      },
    });
    const result = await resolveProviderCredentials({
      configuration: {
        org,
        app,
        service,
      },
      region,
      stage,
    });
    expect(result).to.deep.equal({
      accessKeyId: 'someaccesskeyid',
      secretAccessKey: 'somesecret',
      sessionToken: 'sessiontoken',
    });
  });
});
