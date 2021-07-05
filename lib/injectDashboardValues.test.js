'use strict';

const { expect } = require('chai');
const injectDashboardValues = require('./injectDashboardValues');

const STAGE = 'dev';
const ORG_UID = 'ORGUID';
const APP_UID = 'APPUID';
const SERVICE_NAME = 'SERVICE';

describe('injectDashboardValues', () => {
  it('loads dashboard values into the context as environment variables', async () => {
    const ctx = {
      provider: {
        options: {
          stage: STAGE,
        },
      },
      sls: {
        service: {
          appUid: APP_UID,
          orgUid: ORG_UID,
          service: SERVICE_NAME,
          provider: {},
        },
      },
    };
    await injectDashboardValues(ctx);
    expect(ctx.sls.service.provider.environment).to.deep.equal({
      SLS_SERVICE: SERVICE_NAME,
      SLS_APP_UID: APP_UID,
      SLS_ORG_UID: ORG_UID,
      SLS_STAGE: STAGE,
    });
  });
});
