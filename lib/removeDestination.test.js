'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getAccessKeyForTenant = sinon.stub().resolves('accessKey');
const removeLogDestination = sinon.spy();
const removeDestination = proxyquire('./removeDestination', {
  '@serverless/platform-sdk': { removeLogDestination, getAccessKeyForTenant },
});

describe('removeDestination', () => {
  it('calls the sdk method to remove log destinations', async () => {
    const getServiceName = () => 'service';
    const getRegion = () => 'region';
    const getStage = () => 'stage';

    await removeDestination({
      sls: {
        service: {
          appUid: 'UID',
          tenant: 'tenant',
          getServiceName,
          custom: { enterprise: { collectLambdaLogs: true } },
        },
      },
      provider: { getStage, getRegion },
    });

    expect(getAccessKeyForTenant.calledWith('tenant')).to.be.true;
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
