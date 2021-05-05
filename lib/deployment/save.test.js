'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('saveDeployment', () => {
  let log;
  let parseSave;
  let parseDeploymentData;
  let saveDeployment;

  before(() => {
    parseSave = sinon.stub().resolves({});
    parseDeploymentData = sinon.stub().resolves({ save: parseSave });
    saveDeployment = proxyquire('./save', {
      './parse': parseDeploymentData,
    });
  });
  beforeEach(() => {
    log = sinon.spy();
  });

  it('calls parse & save', async () => {
    const serverless = { cli: { log } };
    const ctx = { sls: serverless, serverless };
    await saveDeployment(ctx);
    expect(parseDeploymentData.args[0]).to.deep.equal([ctx, undefined, undefined, false]);
    expect(parseSave.calledOnce).to.be.true;
    expect(log.lastCall.args[0]).includes(
      'Successfully published your service to the Serverless Dashboard'
    );
  });
});
