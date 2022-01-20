'use strict';

const chai = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

chai.use(require('sinon-chai'));

let deploymentsListResponse;
let isAuthenticated;
const openStub = sinon.stub();

const { expect } = chai;

const ServerlessSDKMock = class ServerlessSDK {
  constructor() {
    this.frameworkDeployments = {
      list: () => deploymentsListResponse,
    };
  }
};

const { dashboardHandler, getDashboardProvidersUrl } = proxyquire('./dashboard', {
  './client-utils': {
    getPlatformClientWithAccessKey: async () => new ServerlessSDKMock(),
  },
  './is-authenticated': () => isAuthenticated,
  'open': openStub,
});

const commonCtx = {
  provider: { getStage: () => 'dev', getRegion: () => 'us-east-1' },
  sls: {
    service: {
      service: 'service',
      org: 'org',
      app: 'app',
    },
  },
};

describe('dashboard', () => {
  beforeEach(() => {
    openStub.resetHistory();
  });

  describe('getDashboardProvidersUrl', () => {
    it('returns correct url', () => {
      const ctx = { ...commonCtx };
      ctx.sls.enterpriseEnabled = true;
      expect(getDashboardProvidersUrl(ctx)).to.equal(
        'https://app.serverless.com/org/apps/app/service/dev/us-east-1/providers'
      );
    });
  });

  describe('dashboardHandler', () => {
    it('opens correct link when service has no previous deployments', async () => {
      isAuthenticated = true;
      deploymentsListResponse = { items: [] };

      await dashboardHandler(commonCtx);
      expect(openStub).to.have.been.calledWith('https://app.serverless.com/');
    });

    it('opens correct link when service has previous deployments', async () => {
      isAuthenticated = true;
      deploymentsListResponse = { items: [{}] };

      await dashboardHandler(commonCtx);
      expect(openStub).to.have.been.calledWith(
        'https://app.serverless.com/org/apps/app/service/dev/us-east-1'
      );
    });
  });
});
