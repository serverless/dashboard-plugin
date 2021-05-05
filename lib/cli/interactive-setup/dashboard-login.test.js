'use strict';

const chai = require('chai');
const { join } = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const fs = require('fs').promises;
const fse = require('fs-extra');
const { readFile } = require('fs-extra');
const yaml = require('yamljs');
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

const platformClientStub = {
  ServerlessSDK: class ServerlessSDK {
    constructor() {
      this.apps = {
        create: async ({ app: { name } }) => ({ appName: name }),
      };

      this.organizations = {
        create: async ({ orgName, username }) => ({
          ownerUserName: username,
          tenantName: orgName,
          ownerAccessKey: 'REGISTERTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          ownerAuth0Id: username,
          ownerUserUid: 'USERUID',
        }),
      };
    }
  },
};

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

  it('Should login when user decides to login', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { accessMode: 'login' },
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

  it('Should not accept invalid email at registration step', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { accessMode: 'register' },
      input: { dashboardEmail: 'invalid.email' },
    });
    await expect(
      step.run({
        serviceDir: process.cwd(),
        configuration: { provider: { name: 'aws', runtime: 'nodejs12.x' } },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
      })
    ).to.eventually.be.rejected.and.have.property('code', 'INVALID_ANSWER');
  });

  it('Should not accept invalid password at registration step', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { accessMode: 'register' },
      input: {
        dashboardEmail: 'test-register-interactive-cli@interactive.cli',
      },
      password: {
        dashboardPassword: 'foo',
      },
    });
    await expect(
      step.run({
        serviceDir: process.cwd(),
        configuration: { provider: { name: 'aws', runtime: 'nodejs12.x' } },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
      })
    ).to.eventually.be.rejected.and.have.property('code', 'INVALID_ANSWER');
  });

  describe('register', () => {
    const serviceName = 'register-test';
    let freshStep;
    before(async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { accessMode: 'register' },
        input: {
          dashboardEmail: 'test-register-interactive-cli@interactive.cli',
        },
        password: {
          dashboardPassword: 'somepassword',
        },
      });
      freshStep = proxyquire('./dashboard-login', {
        '@serverless/platform-client': platformClientStub,
      });
      await fs.copyFile(join(fixturesPath, 'aws-service/serverless.yml'), 'serverless.yml');
      await freshStep.run({
        serviceDir: process.cwd(),
        configuration: {
          service: serviceName,
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
      });
    });

    after(async () => fse.emptyDir(process.cwd()));

    it('Should login', async () => {
      expect(configUtils.getLoggedInUser().userId).to.equal('USERUID');
    });

    it('Should setup monitoring', async () => {
      const serviceConfig = yaml.parse(String(await readFile('serverless.yml')));
      expect(serviceConfig.app).to.equal(`${serviceName}-app`);
      expect(serviceConfig.org).to.equal('testregisterinteractivecli');
    });
  });
});
