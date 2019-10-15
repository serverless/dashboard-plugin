'use strict';

const { join } = require('path');
const sinon = require('sinon');
const { readFile, writeFile } = require('fs-extra');
const yaml = require('yamljs');
const runServerless = require('@serverless/test/run-serverless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const { getLoggedInUser, writeConfigFile } = require('@serverless/platform-sdk');
const setAppConfiguration = require('./set-app');

const setupServerless = require('../../test/setupServerless');

const dashboardPluginPath = require.resolve('../../');
const fixturesPath = join(__dirname, 'test/fixtures');
const nonAwsServicePath = join(fixturesPath, 'non-aws-service');
const awsServicePath = join(fixturesPath, 'aws-service');
const awsLoggedInServicePath = join(fixturesPath, 'aws-loggedin-service');

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
  register: async (email, password, userName, tenantName) => {
    return {
      ownerUserName: userName,
      tenantName,
      ownerAccessKey: 'REGISTERTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      ownerAuth0Id: userName,
    };
  },
  writeConfigFile,
};

describe('interactiveCli: register', function() {
  this.timeout(1000 * 60 * 3);

  let serverlessPath;
  let modulesCacheStub;
  let inquirer;
  let backupIsTTY;

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    serverlessPath = (await setupServerless()).root;
    const inquirerPath = join(serverlessPath, 'lib/plugins/interactiveCli/inquirer');
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
    runServerless(serverlessPath, {
      cwd: fixturesPath,
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
    }));

  it('Should be ineffective, when not at AWS service path', () => {
    return runServerless(serverlessPath, {
      cwd: nonAwsServicePath,
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
    });
  });

  it('Should be ineffective, when logged in', () => {
    return runServerless(serverlessPath, {
      cwd: awsLoggedInServicePath,
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
      modulesCacheStub,
    });
  });

  it('Should abort if user opts out', () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: false },
    });
    return runServerless(serverlessPath, {
      cwd: awsServicePath,
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
      modulesCacheStub,
    });
  });

  it('Should login when user decides to login', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { accessMode: 'login' },
    });
    await runServerless(serverlessPath, {
      cwd: awsServicePath,
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
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
      await runServerless(serverlessPath, {
        cwd: awsServicePath,
        pluginPathsWhitelist: [dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
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
      await runServerless(serverlessPath, {
        cwd: awsServicePath,
        pluginPathsWhitelist: [dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
        modulesCacheStub,
      });
      throw new Error('Unexpected');
    } catch (error) {
      if (error.code !== 'INVALID_ANSWER') throw error;
    }
  });

  describe('register', () => {
    const userConfigPath = join(awsServicePath, '.serverlessrc');
    const serviceConfigPath = join(awsServicePath, 'serverless.yml');
    let originalUserConfig;
    let originalServiceConfig;
    let registeredUser;
    before(async () => {
      [originalUserConfig, originalServiceConfig] = await Promise.all([
        readFile(userConfigPath),
        readFile(serviceConfigPath),
      ]);
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
      return runServerless(serverlessPath, {
        cwd: awsServicePath,
        pluginPathsWhitelist: [dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
        modulesCacheStub,
        hooks: {
          after: () => {
            registeredUser = getLoggedInUser();
          },
        },
      });
    });
    after(() =>
      Promise.all([
        writeFile(userConfigPath, originalUserConfig),
        writeFile(serviceConfigPath, originalServiceConfig),
      ])
    );

    it('Should login', async () => {
      expect(registeredUser.userId).to.equal('testregisterinteractivecli');
    });

    it('Should setup monitoring', async () => {
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.app).to.equal('some-aws-service-app');
      expect(serviceConfig.org).to.equal('testregisterinteractivecli');
    });
  });

  describe('register', () => {
    const userConfigPath = join(awsServicePath, '.serverlessrc');
    const serviceConfigPath = join(awsServicePath, 'serverless.yml');
    let originalUserConfig;
    let originalServiceConfig;
    let registeredUser;
    before(async () => {
      [originalUserConfig, originalServiceConfig] = await Promise.all([
        readFile(userConfigPath),
        readFile(serviceConfigPath),
      ]);
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
      return runServerless(serverlessPath, {
        cwd: awsServicePath,
        pluginPathsWhitelist: [dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws'],
        modulesCacheStub,
        hooks: {
          after: () => {
            registeredUser = getLoggedInUser();
          },
        },
      });
    });
    after(() =>
      Promise.all([
        writeFile(userConfigPath, originalUserConfig),
        writeFile(serviceConfigPath, originalServiceConfig),
      ])
    );

    it('Should login', async () => {
      expect(registeredUser.userId).to.equal('testregisterinteractivecli');
    });

    it('Should setup monitoring', async () => {
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.app).to.equal('some-aws-service-app');
      expect(serviceConfig.org).to.equal('testregisterinteractivecli');
    });
  });
});
