'use strict';

const parseDeploymentData = require('./parse');
const saveDeployment = require('./save');

jest.mock('./parse', () =>
  jest.fn().mockReturnValue(
    Promise.resolve({
      save: jest.fn().mockReturnValue({ dashboardUrl: 'https://dashboard.serverless.com/foo' }),
    })
  )
);

describe('saveDeployment', () => {
  let log;
  beforeEach(() => {
    log = jest.fn();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    parseDeploymentData.mockClear();
  });

  it('calls parse & save', async () => {
    const serverless = { cli: { log } };
    const ctx = { sls: serverless, serverless };
    await saveDeployment(ctx);
    expect(parseDeploymentData).toBeCalledWith(ctx, undefined, undefined, false);
    expect((await parseDeploymentData()).save).toHaveBeenCalledTimes(1);
    expect(log).toBeCalledWith(
      'Successfully published your service to the Serverless Dashboard: https://dashboard.serverless.com/foo'
    );
  });
});
