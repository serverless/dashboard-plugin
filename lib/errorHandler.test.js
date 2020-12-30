'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const parseDeploymentData = sinon.stub().resolves({ save: async () => ({ dashboardUrl: 'URL' }) });
const errorHandler = proxyquire('./errorHandler', {
  './deployment': { parseDeploymentData },
});

describe('errorHandler', () => {
  it('creates a depoyment with serialized error and saves it', async () => {
    const error = new Error('foobar');
    const ctx = { sls: { cli: { log: sinon.spy() } }, state: {} };
    await errorHandler(ctx)(error);
    expect(parseDeploymentData.args[0][0]).to.deep.equal(ctx);
    expect(parseDeploymentData.args[0][1]).to.equal('error');
    expect(ctx.sls.cli.log.calledWith('Publishing service to the Serverless Dashboard...')).to.be
      .true;
    expect(ctx.sls.cli.log.lastCall.args[0]).includes(
      'Successfully published your service to the Serverless Dashboard'
    );
  });
});
