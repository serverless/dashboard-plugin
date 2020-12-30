'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('removeDestination', () => {
  let getAccessKeyForTenant;
  let removeLogDestination;
  let removeDestination;
  before(() => {
    getAccessKeyForTenant = sinon.stub().resolves('accessKey');
    removeLogDestination = sinon.spy();
    removeDestination = proxyquire('./removeDestination', {
      '@serverless/platform-sdk': { removeLogDestination, getAccessKeyForTenant },
    });
  });

  it('calls the sdk method to remove log destinations', async () => {
    const getServiceName = () => 'service';
    const getRegion = () => 'region';
    const getStage = () => 'stage';

    await removeDestination({
      sls: {
        service: {
          appUid: 'UID',
          org: 'org',
          getServiceName,
          custom: { enterprise: { collectLambdaLogs: true } },
        },
      },
      provider: { getStage, getRegion },
    });

    expect(getAccessKeyForTenant.calledWith('org')).to.be.true;
    expect(removeLogDestination.args[0][0]).to.deep.equal({
      appUid: 'UID',
      serviceName: 'service',
      stageName: 'stage',
      regionName: 'region',
      accessKey: 'accessKey',
      tenantUid: undefined,
    });
  });
});
