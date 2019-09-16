'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

const parseSave = sinon.stub().resolves({ dashboardUrl: 'https://dashboard.serverless.com/foo' });
const parseDeploymentData = sinon.stub().resolves({ save: parseSave });
const saveDeployment = proxyquire('./save', {
  './parse': parseDeploymentData,
});

describe('saveDeployment', () => {
  let log;
  beforeEach(() => {
    log = sinon.spy();
  });

  it('calls parse & save', async () => {
    const serverless = { cli: { log } };
    const ctx = { sls: serverless, serverless };
    await saveDeployment(ctx);
    expect(parseDeploymentData.args[0]).to.deep.equal([ctx, undefined, undefined, false]);
    expect(parseSave.calledOnce).to.be.true;
    expect(log.lastCall.args[0]).to.equal(
      'Successfully published your service to the Serverless Dashboard: https://dashboard.serverless.com/foo'
    );
  });
});
