'use strict';

const { join } = require('path');
const sinon = require('sinon');
const { readFile } = require('fs-extra');
const yaml = require('yamljs');
const resolveSync = require('ncjsm/resolve/sync');
const runServerless = require('../../test/run-serverless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const { getLoggedInUser, writeConfigFile } = require('@serverless/platform-sdk');
const setAppConfiguration = require('./set-app');

const setupServerless = require('../../test/setupServerless');

const lifecycleHookNamesBlacklist = [
  'interactiveCli:initializeService',
  'interactiveCli:setupAws',
  'interactiveCli:tabCompletion',
];

const platformSdkStub = {
  configureFetchDefaults: () => {},
  createApp: async ({ app }) => ({ appName: app }),
  getLoggedInUser,
  getMetadata: async () => ({
    awsAccountId: '377024778620',
    supportedRuntimes: ['nodejs8.10', 'nodejs10.x', 'python2.7', 'python3.6', 'python3.7'],
    supportedRegions: [
      'us-east-1',
      'us-east-2',
      'us-west-2',
      'eu-central-1',
      'eu-west-1',
      'eu-west-2',
      'ap-northeast-1',
      'ap-southeast-1',
      'ap-southeast-2',
    ],
  }),
  login: sinon.stub().resolves(),
  register: async (email, password, userName, orgName) => {
    return {
      ownerUserName: userName,
      tenantName: orgName,
      ownerAccessKey: 'REGISTERTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      ownerAuth0Id: userName,
    };
  },
  writeConfigFile,
};

describe('interactiveCli: register', function () {
  this.timeout(1000 * 60 * 3);

  let modulesCacheStub;
  let inquirer;
  let backupIsTTY;

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    const serverlessPath = (await setupServerless()).root;
    const inquirerPath = resolveSync(serverlessPath, '@serverless/utils/inquirer').realPath;
    inquirer = require(inquirerPath);
    modulesCacheStub = {
      [require.resolve(inquirerPath)]: inquirer,
      [require.resolve('../deployProfile')]: { configureDeployProfile: async () => {} },
      [require.resolve('./set-app')]: setAppConfiguration,
      [require.resolve('@serverless/platform-sdk')]: platformSdkStub,
    };
    sinon.stub(setAppConfiguration, 'check').resolves(false);
  });
  after(() => {
    process.stdin.isTTY = backupIsTTY;
    sinon.restore();
  });

  afterEach(() => {
    if (inquirer.prompt.restore) inquirer.prompt.restore();
    sinon.reset();
  });

  it('Should be ineffective, when not at service path', () =>
    runServerless({
      noService: true,
      lifecycleHookNamesBlacklist,
    }));

  it('Should be ineffective, when not at AWS service path', () => {
    return runServerless({
      fixture: 'non-aws-service',
      lifecycleHookNamesBlacklist,
    });
  });

  it('Should be ineffective, when not at supported runtime service path', () => {
    return runServerless({
      fixture: 'non-supported-runtime-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should be ineffective, when logged in', () => {
    return runServerless({
      fixture: 'aws-loggedin-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should abort if user opts out', () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: false },
    });
    return runServerless({
      fixture: 'aws-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should login when user decides to login', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { accessMode: 'login' },
    });
    await runServerless({
      fixture: 'aws-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
    expect(platformSdkStub.login.calledOnce).to.be.true;
  });

  it('Should not accept invalid email at registration step', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { accessMode: 'register' },
      input: { dashboardEmail: 'invalid.email' },
    });
    try {
      await runServerless({
        fixture: 'aws-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      throw new Error('Unexpected');
    } catch (error) {
      if (error.code !== 'INVALID_ANSWER') throw error;
    }
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
    try {
      await runServerless({
        fixture: 'aws-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      throw new Error('Unexpected');
    } catch (error) {
      if (error.code !== 'INVALID_ANSWER') throw error;
    }
  });

  describe('register', () => {
    let serviceConfigPath;
    let serviceName;
    let registeredUser;
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
      const {
        fixtureData: { serviceConfig, servicePath },
      } = await runServerless({
        fixture: 'aws-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
        hooks: {
          after: () => {
            registeredUser = getLoggedInUser();
          },
        },
      });

      serviceConfigPath = join(servicePath, 'serverless.yml');
      serviceName = serviceConfig.service;
    });

    it('Should login', async () => {
      expect(registeredUser.userId).to.equal('testregisterinteractivecli');
    });

    it('Should setup monitoring', async () => {
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.app).to.equal(`${serviceName}-app`);
      expect(serviceConfig.org).to.equal('testregisterinteractivecli');
    });
  });
});
