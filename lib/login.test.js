'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('login', () => {
  let exit;
  let sdkLogin;
  let login;

  before(() => {
    sdkLogin = sinon.stub().callsFake(org => {
      return org === 'signup'
        ? Promise.reject('Complete sign-up before logging in.')
        : Promise.resolve();
    });

    login = proxyquire('./login', {
      '@serverless/platform-sdk': { login: sdkLogin },
    });
  });

  beforeEach(() => {
    ({ exit } = process);
    process.exit = sinon.spy();
  });

  afterEach(() => {
    process.exit = exit;
    sdkLogin.resetHistory();
  });

  it('calls sdk.login and logs success', async () => {
    const log = sinon.spy();
    const ctx = { sls: { service: { org: 'org', app: 'app' }, cli: { log } } };
    await login(ctx);
    expect(sdkLogin.calledWith('org')).to.be.true;
    expect(log.calledWith('You sucessfully logged in to Serverless.')).to.be.true;
    expect(process.exit.calledWith(0)).to.be.true;
  });

  it('calls sdk.login and logs success and warning if app or org mssing', async () => {
    const log = sinon.spy();
    const ctx = { sls: { service: {}, cli: { log } } };
    await login(ctx);
    expect(sdkLogin.calledWith(undefined)).to.be.true;
    expect(log.calledWith('You sucessfully logged in to Serverless.')).to.be.true;
    expect(log.calledWith("Please run 'serverless' to configure your service")).to.be.true;
    expect(process.exit.calledWith(0)).to.be.true;
  });

  it('calls logs a gentle error for signup "error"', async () => {
    const log = sinon.spy();
    const ctx = { sls: { service: { org: 'signup' }, cli: { log } } };
    await login(ctx);
    expect(sdkLogin.calledWith('signup')).to.be.true;
    expect(
      log.calledWith(
        "Please complete sign-up at dashboard.serverless.com, then run 'serverless' to configure your service"
      )
    ).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;
  });
});
