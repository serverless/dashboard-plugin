'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getApp = sinon.stub().resolves({ appUid: 'AUID', tenantUid: 'TUID' });
const appUids = proxyquire('./appUids', {
  '@serverless/platform-sdk': { getApp },
});

describe('appUids', () => {
  it('returns app uid', async () => {
    const uids = await appUids('tenant', 'app');
    expect(getApp.args[0][0]).to.deep.equal({ tenant: 'tenant', app: 'app' });
    expect(uids).to.deep.equal({ appUid: 'AUID', orgUid: 'TUID' });
  });
});
