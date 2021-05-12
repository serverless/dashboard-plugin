'use strict';

const chai = require('chai');
const { join } = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const resolveSync = require('ncjsm/resolve/sync');
const overrideCwd = require('process-utils/override-cwd');
const setupServerless = require('../../../test/setupServerless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const step = require('./dashboard-login');
const configUtils = require('@serverless/utils/config');
const enableConfirm = require('./enable-confirm');

const { expect } = chai;

chai.use(require('chai-as-promised'));

const fixturesPath = join(__dirname, '../../../test/fixtures');

describe('lib/cli/interactive-setup/dashboard-login.test.js', function () {
  this.timeout(1000 * 60 * 3);

  let inquirer;
  const loginStub = sinon.stub().resolves();

  before(async () => {
    const serverlessPath = (await setupServerless()).root;
    const inquirerPath = resolveSync(serverlessPath, '@serverless/utils/inquirer').realPath;
    inquirer = require(inquirerPath);
  });
  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    if (inquirer.prompt.restore) inquirer.prompt.restore();
    sinon.reset();
    enableConfirm.clear();
  });

  it('Should be ineffective, when not at service path', async () =>
    expect(await step.isApplicable({})).to.be.false);

  it('Should be ineffective, when not at AWS service path', async () =>
    expect(
      await step.isApplicable({
        serviceDir: process.cwd(),
        configuration: {},
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
      })
    ).to.equal(false));

  it('Should be ineffective, when not at supported runtime service path', async () =>
    expect(
      await step.isApplicable({
        serviceDir: process.cwd(),
        configuration: { provider: { name: 'aws', runtime: 'java8' } },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
      })
    ).to.equal(false));

  it('Should be ineffective, when logged in', async () => {
    expect(
      await overrideCwd(
        join(fixturesPath, 'aws-loggedin-service'),
        async () =>
          await step.isApplicable({
            serviceDir: process.cwd(),
            configuration: { provider: { name: 'aws', runtime: 'nodejs12.x' } },
            configurationFilename: 'serverless.yml',
            options: {},
            inquirer,
          })
      )
    ).to.equal(false);
  });

  it('Should abort if user opts out', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: false },
    });
    await step.run({
      serviceDir: process.cwd(),
      configuration: { provider: { name: 'aws', runtime: 'nodejs12.x' } },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    });
    expect(configUtils.getLoggedInUser()).to.be.null;
  });

  it('Should invoke login when user decides to login/register', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { shouldLoginOrRegister: 'Yes' },
    });
    const freshStep = proxyquire('./dashboard-login', {
      '../../login': loginStub,
    });
    await freshStep.run({
      serviceDir: process.cwd(),
      configuration: { provider: { name: 'aws', runtime: 'nodejs12.x' } },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    });
    expect(loginStub.calledOnce).to.be.true;
  });

  it('Should invoke login when user decides not to login/register', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { shouldLoginOrRegister: 'No' },
    });
    const freshStep = proxyquire('./dashboard-login', {
      '../../login': loginStub,
    });
    await freshStep.run({
      serviceDir: process.cwd(),
      configuration: { provider: { name: 'aws', runtime: 'nodejs12.x' } },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    });
    expect(loginStub.called).to.be.false;
  });
});
