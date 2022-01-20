'use strict';

const chai = require('chai');
const proxyquire = require('proxyquire');
const overrideEnv = require('process-utils/override-env');
const sinon = require('sinon');

chai.use(require('chai-as-promised'));

const expect = chai.expect;

const platformClientStub = {
  ServerlessSDK: class ServerlessSDK {
    constructor() {
      this.accessKeys = {
        create: async () => ({ secretAccessKey: 'createdAccessKey' }),
      };
    }

    config() {}
  },
};

describe('lib/client-utils.test.js', () => {
  const orgName = 'testorg';

  describe('getOrCreateAccessKeyForOrg', () => {
    it('returns SERVERLESS_ACCESS_KEY from env if set', async () => {
      const { getOrCreateAccessKeyForOrg } = proxyquire('./client-utils', {
        '@serverless/utils/config': {
          getLoggedInUser: () => null,
        },
      });
      let result;
      const accessKeyFromEnv = 'accesskeyfromenv';

      await overrideEnv({ variables: { SERVERLESS_ACCESS_KEY: accessKeyFromEnv } }, async () => {
        result = await getOrCreateAccessKeyForOrg(orgName);
      });

      expect(result).to.equal(accessKeyFromEnv);
    });

    it('throws an error if user does not exist', async () => {
      const { getOrCreateAccessKeyForOrg } = proxyquire('./client-utils', {
        '@serverless/utils/config': {
          getLoggedInUser: () => null,
        },
      });

      await expect(getOrCreateAccessKeyForOrg(orgName)).to.be.rejectedWith(
        'Could not find logged in user. Please log in.'
      );
    });

    it('returns an existing access key from config', async () => {
      const accessKeyFromConfig = 'existingaccesskey';

      const { getOrCreateAccessKeyForOrg } = proxyquire('./client-utils', {
        '@serverless/utils/config': {
          getLoggedInUser: () => ({
            userId: 'someuserid',
            accessKeys: {
              [orgName]: accessKeyFromConfig,
            },
          }),
        },
      });

      const result = await getOrCreateAccessKeyForOrg(orgName);
      expect(result).to.equal(accessKeyFromConfig);
    });

    it('throws if it could not create an access key when user does not have idToken', async () => {
      const { getOrCreateAccessKeyForOrg } = proxyquire('./client-utils', {
        '@serverless/utils/config': {
          getLoggedInUser: () => ({
            userId: 'someuserid',
          }),
        },
      });

      await expect(getOrCreateAccessKeyForOrg(orgName)).to.be.rejectedWith(
        'Could not create a new access key. Please log out and log in and try again.'
      );
    });

    it('succesfully returns and persists created access key', async () => {
      const configUtilsSetStub = sinon.stub();
      const { getOrCreateAccessKeyForOrg } = proxyquire('./client-utils', {
        '@serverless/utils/config': {
          getLoggedInUser: () => ({ userId: 'userid', idToken: 'sometoken', username: 'user' }),
          set: configUtilsSetStub,
        },
        '@serverless/platform-client': platformClientStub,
      });

      const result = await getOrCreateAccessKeyForOrg(orgName);
      expect(result).to.equal('createdAccessKey');
      expect(
        configUtilsSetStub.calledWith({
          users: {
            userid: {
              dashboard: { accessKeys: { [orgName]: result } },
            },
          },
        })
      ).to.be.true;
    });
  });
});
