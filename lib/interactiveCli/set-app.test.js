'use strict';

const { expect } = require('chai');
const { join } = require('path');
const sinon = require('sinon');
const { readFile } = require('fs-extra');
const yaml = require('yamljs');
const resolveSync = require('ncjsm/resolve/sync');
const runServerless = require('../..//test/run-serverless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const registerConfiguration = require('./register');
const semver = require('semver');

const setupServerless = require('../../test/setupServerless');

const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const lifecycleHookNamesBlacklist = [
  'interactiveCli:initializeService',
  'interactiveCli:setupAws',
  'interactiveCli:tabCompletion',
];

describe('interactiveCli: set-app', function () {
  this.timeout(1000 * 60 * 3);

  let serverlessPath;
  let serverlessVersion;
  let inquirer;
  let backupIsTTY;
  let modulesCacheStub;
  let appsCreateStub;
  let deploymentProfilesSetDefaultStub;

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    const { root, version } = await setupServerless();
    serverlessPath = root;
    serverlessVersion = version;
    const inquirerPath = resolveSync(serverlessPath, '@serverless/utils/inquirer').realPath;
    inquirer = require(inquirerPath);
    appsCreateStub = sinon.spy(async ({ app: { name } }) => ({ appName: name }));
    deploymentProfilesSetDefaultStub = sinon.stub().resolves();

    modulesCacheStub = {
      [require.resolve(inquirerPath)]: inquirer,
      [require.resolve('.//register')]: registerConfiguration,
      [require.resolve('../deployProfile')]: { configureDeployProfile: async () => {} },
      [configUtilsPath]: {
        getLoggedInUser: () => ({
          idToken: '123',
          accessKeys: { testinteractivecli: 'accesskey', otherorg: 'accesskey' },
        }),
      },
      [platformClientPath]: {
        ServerlessSDK: class ServerlessSDK {
          constructor() {
            this.metadata = {
              get: async () => {
                return {
                  awsAccountId: '377024778620',
                  supportedRuntimes: [
                    'nodejs10.x',
                    'nodejs12.x',
                    'python2.7',
                    'python3.6',
                    'python3.7',
                  ],
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
                };
              },
            };

            this.apps = {
              create: appsCreateStub,
              list: async () => {
                return [
                  { appName: 'some-aws-service-app' },
                  { appName: 'other-app' },
                  { appName: 'app-from-flag' },
                ];
              },
            };

            this.deploymentProfiles = {
              list: async () => {
                return [{ deploymentProfileUid: 'some-deploy-profile' }];
              },
              setDefault: deploymentProfilesSetDefaultStub,
            };

            this.organizations = {
              list: async () => [{ tenantName: 'testinteractivecli' }, { tenantName: 'otherorg' }],
            };
          }

          async refreshToken() {
            return {};
          }

          config() {}
        },
      },
    };
    sinon.stub(registerConfiguration, 'check').resolves(false);
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
      modulesCacheStub,
    }));

  it('Should be ineffective, when not at AWS service path', () => {
    return runServerless({
      fixture: 'non-aws-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should be ineffective, when not at supported runtime service path', () => {
    return runServerless({
      fixture: 'non-supported-runtime-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should be ineffective, when not logged in', () => {
    return runServerless({
      fixture: 'aws-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub: {
        ...modulesCacheStub,
        [configUtilsPath]: {
          getLoggedInUser: () => null,
        },
      },
    });
  });

  it('Should be ineffective, when no orgs are resolved', () => {
    return runServerless({
      fixture: 'aws-loggedin-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub: {
        ...modulesCacheStub,
        [platformClientPath]: {
          ServerlessSDK: class ServerlessSDK {
            constructor() {
              this.metadata = {
                get: async () => {
                  return {
                    awsAccountId: '377024778620',
                    supportedRuntimes: ['nodejs10.x', 'nodejs12.x'],
                    supportedRegions: ['us-east-1'],
                  };
                },
              };
              this.organizations = {
                list: async () => [],
              };
            }

            config() {}
          },
        },
      },
    });
  });

  it('Should be ineffective, when project has monitoring setup with recognized org and app', () => {
    return runServerless({
      fixture: 'aws-loggedin-monitored-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should reject an invalid app name', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      input: { newAppName: 'invalid app name /* Ć */' },
      list: { orgName: 'testinteractivecli', appName: '_create_' },
    });
    try {
      await runServerless({
        fixture: 'aws-loggedin-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      throw new Error('Unexpected');
    } catch (error) {
      if (error.code !== 'INVALID_ANSWER') throw error;
    }
  });

  it('Should recognize an invalid org and allow to opt out', () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true, shouldUpdateOrg: false },
    });
    return runServerless({
      fixture: 'aws-loggedin-wrongorg-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should recognize an invalid app and allow to opt out', () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { appUpdateType: 'skip' },
    });
    return runServerless({
      fixture: 'aws-loggedin-wrongapp-service',
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  describe('Monitoring setup', () => {
    it('Should setup monitoring for chosen org and app', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup from CLI flags', () => {
    it('Should setup monitoring for chosen org and app', async () => {
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-service',
        cliArgs: ['--org', 'testinteractivecli', '--app', 'other-app'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });

    it('Should setup monitoring for chosen org and app even if already configured', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-monitored-service',
        cliArgs: ['--org', 'otherorg', '--app', 'app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('otherorg');
      expect(serviceConfig.app).to.equal('app-from-flag');
      expect(serverless.service.org).to.equal('otherorg');
      expect(serverless.service.app).to.equal('app-from-flag');
    });

    it('Should not setup monitoring for chosen org and app even if already configured if rejected', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: false },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-monitored-service',
        cliArgs: ['--org', 'otherorg', '--app', 'app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('some-aws-service-app');
      expect(serverless.service.org).to.equal(undefined);
      expect(serverless.service.app).to.equal(undefined);
    });

    it('Should ask for org if passed in one is invalid', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-service',
        cliArgs: ['--org', 'invalid-testinteractivecli', '--app', 'irrelevant'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });

    it('Should ask for org if passed in one is invalid and there is a valid on in config', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
        list: { orgName: 'otherorg', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-monitored-service',
        cliArgs: ['--org', 'invalid-testinteractivecli', '--app', 'irrelevant'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('otherorg');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('otherorg');
      expect(serverless.service.app).to.equal('other-app');
    });

    it('Should ask for app if passed in one is invalid and there is a valid on in config', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-monitored-service',
        cliArgs: ['--org', 'testinteractivecli', '--app', 'invalid'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });

    it('Should ask for app if passed in one is invalid', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-service',
        cliArgs: ['--org', 'testinteractivecli', '--app', 'invalid'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });

    it('Should create new app when requested, and setup monitoring with it', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        input: { newAppName: 'frominput' },
        list: { orgName: 'testinteractivecli', appName: '_create_' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('frominput');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('frominput');
      expect(appsCreateStub.calledOnce).to.be.true;
      expect(deploymentProfilesSetDefaultStub.calledOnce).to.be.true;
    });
  });

  describe('Monitoring setup when invalid org', () => {
    it('Should provide a way to setup monitoring with an invalid org setting', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true, shouldUpdateOrg: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-wrongorg-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup when no app', () => {
    it('Should allow to setup app', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-noapp-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup when no app with --app flag', () => {
    it('Should allow to setup app', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-noapp-service',
        cliArgs: ['--app', 'app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('app-from-flag');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('app-from-flag');
    });

    it('Should allow to setup app when app is invalid', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        list: { appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-noapp-service',
        cliArgs: ['--app', 'invalid-app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup when invalid app', () => {
    it('Should recognize an invalid app and allow to create it', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { appUpdateType: 'create' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-wrongapp-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('not-created-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('not-created-app');
    });

    it('Should recognize an invalid app and allow to replace it with existing one', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { appUpdateType: 'chooseExisting', appName: 'other-app' },
      });
      const {
        serverless,
        fixtureData: { servicePath },
      } = await runServerless({
        fixture: 'aws-loggedin-wrongapp-service',
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });
});
