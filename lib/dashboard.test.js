'use strict';

const chai = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const overrideStdoutWrite = require('process-utils/override-stdout-write');
const stripAnsi = require('strip-ansi');

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
  './clientUtils': {
    getPlatformClientWithAccessKey: async () => new ServerlessSDKMock(),
  },
  './isAuthenticated': () => isAuthenticated,
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
    it('prints correct message when service is not integrated with dashboard', async () => {
      isAuthenticated = true;
      const ctx = {
        ...commonCtx,
        sls: {
          service: {
            service: 'service',
          },
        },
      };

      let stdoutData = '';
      await overrideStdoutWrite(
        (data) => (stdoutData += data),
        async () => {
          await dashboardHandler(ctx);
        }
      );
      expect(stripAnsi(stdoutData)).to.include(
        'This service does not use the Serverless Dashboard. Run serverless to get started.'
      );
    });

    it('prints correct message if user is not authenticated', async () => {
      isAuthenticated = false;

      let stdoutData = '';
      await overrideStdoutWrite(
        (data) => (stdoutData += data),
        async () => {
          await dashboardHandler(commonCtx);
        }
      );
      expect(stripAnsi(stdoutData)).to.include(
        'Could not find logged in user. Run serverless login and try again'
      );
    });

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
