'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getCredentials = sinon.stub().returns({
  accessKeyId: 'accessKeyId',
  secretAccessKey: 'secretAccessKey',
  sessionToken: 'sessionToken',
});
const getAccessKeyForTenant = sinon.stub().resolves('ACCESS_KEY');

const getCredentialsLocal = proxyquire('./credentials', {
  '@serverless/platform-sdk': { getCredentials, getAccessKeyForTenant },
});

describe('credentials', () => {
  it('calls API func and sets env vars', async () => {
    process.env.SLS_CLOUD_ACCESS = 'true';
    const log = sinon.spy();
    const getStage = sinon.stub().returns('stage');
    const getServiceName = sinon.stub().returns('service');
    const ctx = {
      sls: {
        processedInput: { commands: ['deploy'] },
        service: {
          app: 'app',
          org: 'org',
          getServiceName,
        },
        cli: { log },
      },
      provider: { getStage },
    };
    await getCredentialsLocal(ctx);
    expect(getAccessKeyForTenant.args[0][0]).to.equal('org');
    expect(getCredentials.args[0][0]).to.deep.equal({
      stageName: 'stage',
      command: 'deploy',
      app: 'app',
      tenant: 'org',
      service: 'service',
      accessKey: 'ACCESS_KEY',
    });
    expect(log.args[0][0]).to.equal('Cloud credentials set from Serverless Platform.');
    expect(process.env.AWS_ACCESS_KEY_ID).to.equal('accessKeyId');
    expect(process.env.AWS_SECRET_ACCESS_KEY).to.equal('secretAccessKey');
    expect(process.env.AWS_SESSION_TOKEN).to.equal('sessionToken');
  });
});
