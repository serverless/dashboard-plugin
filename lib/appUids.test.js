'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getAppStub = sinon.stub().resolves({ appUid: 'AUID', tenantUid: 'OUID' });
const appUids = proxyquire('./appUids', {
  './clientUtils': {
    getPlatformClientWithAccessKey: () => ({
      apps: {
        get: getAppStub,
      },
    }),
  },
});

describe('appUids', () => {
  it('returns app uid', async () => {
    const uids = await appUids('org', 'app');
    expect(getAppStub.args[0][0]).to.deep.equal({ orgName: 'org', appName: 'app' });
    expect(uids).to.deep.equal({ appUid: 'AUID', orgUid: 'OUID' });
  });
});
