'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('removeDestination', () => {
  let removeLogDestinationSpy;
  let removeDestination;
  before(() => {
    removeLogDestinationSpy = sinon.spy();
    removeDestination = proxyquire('./remove-destination', {
      './client-utils': {
        getPlatformClientWithAccessKey: () => ({
          logDestinations: {
            remove: removeLogDestinationSpy,
          },
        }),
      },
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
          orgUid: 'orgUID',
          getServiceName,
          custom: { enterprise: { collectLambdaLogs: true } },
        },
      },
      provider: { getStage, getRegion },
    });

    expect(removeLogDestinationSpy.args[0][0]).to.deep.equal({
      appUid: 'UID',
      serviceName: 'service',
      stageName: 'stage',
      regionName: 'region',
      orgUid: 'orgUID',
    });
  });
});
