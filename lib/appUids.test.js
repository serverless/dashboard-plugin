'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getApp = sinon.stub().resolves({ appUid: 'AUID', tenantUid: 'OUID' });
const appUids = proxyquire('./appUids', {
  '@serverless/platform-sdk': { getApp },
});

describe('appUids', () => {
  it('returns app uid', async () => {
    const uids = await appUids('org', 'app');
    expect(getApp.args[0][0]).to.deep.equal({ tenant: 'org', app: 'app' });
    expect(uids).to.deep.equal({ appUid: 'AUID', orgUid: 'OUID' });
  });
});
