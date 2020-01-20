'use strict';

const { join } = require('path');
const sinon = require('sinon');
const { readFile, writeFile } = require('fs-extra');
const yaml = require('yamljs');
const runServerless = require('@serverless/test/run-serverless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const { getLoggedInUser } = require('@serverless/platform-sdk');
const registerConfiguration = require('./register');
const semver = require('semver');

const setupServerless = require('../../test/setupServerless');

const platformSdkPath = require.resolve('@serverless/platform-sdk');
const fixturesPath = join(__dirname, '../../test/fixtures');
const nonAwsServicePath = join(fixturesPath, 'non-aws-service');
const nonSupportedRuntimeServicePath = join(fixturesPath, 'non-supported-runtime-service');
const awsServicePath = join(fixturesPath, 'aws-service');
const awsLoggedInServicePath = join(fixturesPath, 'aws-loggedin-service');
const awsLoggedInMonitoredServicePath = join(fixturesPath, 'aws-loggedin-monitored-service');
const awsLoggedInWrongOrgServicePath = join(fixturesPath, 'aws-loggedin-wrongorg-service');
const awsLoggedInNoAppServicePath = join(fixturesPath, 'aws-loggedin-noapp-service');
const awsLoggedInWrongAppServicePath = join(fixturesPath, 'aws-loggedin-wrongapp-service');
const lifecycleHookNamesBlacklist = [
  'interactiveCli:initializeService',
  'interactiveCli:setupAws',
  'interactiveCli:tabCompletion',
];

describe('interactiveCli: set-app', function() {
  this.timeout(1000 * 60 * 3);

  let serverlessPath;
  let serverlessVersion;
  let inquirer;
  let backupIsTTY;
  let platformSdkStub;
  let modulesCacheStub;
  let createAppStub;
  let setDefaultDeploymentProfileStub;

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    const { root, version } = await setupServerless();
    serverlessPath = root;
    serverlessVersion = version;
    const inquirerPath = join(serverlessPath, 'lib/plugins/interactiveCli/inquirer');
    inquirer = require(inquirerPath);
    createAppStub = sinon.spy(async ({ app }) => ({ appName: app }));
    setDefaultDeploymentProfileStub = sinon.stub().resolves();

    platformSdkStub = {
      configureFetchDefaults: () => {},
      createApp: createAppStub,
      getApps: async () => [
        { appName: 'some-aws-service-app' },
        { appName: 'other-app' },
        { appName: 'app-from-flag' },
      ],
      getDeployProfiles: async () => [{ deploymentProfileUid: 'some-deploy-profile' }],
      getLoggedInUser,
      getMetadata: async () => ({
        awsAccountId: '377024778620',
        supportedRuntimes: ['nodejs10.x', 'nodejs12.x', 'python2.7', 'python3.6', 'python3.7'],
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
      listTenants: async () => [{ tenantName: 'testinteractivecli' }, { tenantName: 'otherorg' }],
      login: sinon.stub().resolves(),
      refreshToken: async () => {},
      setDefaultDeploymentProfile: setDefaultDeploymentProfileStub,
    };
    modulesCacheStub = {
      [require.resolve(inquirerPath)]: inquirer,
      [require.resolve('./utils')]: { resolveAccessKey: async () => 'token' },
      [require.resolve('.//register')]: registerConfiguration,
      [require.resolve('../deployProfile')]: { configureDeployProfile: async () => {} },
      [platformSdkPath]: platformSdkStub,
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
    runServerless(serverlessPath, {
      cwd: fixturesPath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    }));

  it('Should be ineffective, when not at AWS service path', () => {
    return runServerless(serverlessPath, {
      cwd: nonAwsServicePath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should be ineffective, when not at supported runtime service path', () => {
    return runServerless(serverlessPath, {
      cwd: nonSupportedRuntimeServicePath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should be ineffective, when not logged in', () => {
    return runServerless(serverlessPath, {
      cwd: awsServicePath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should be ineffective, when no orgs are resolved', () => {
    return runServerless(serverlessPath, {
      cwd: awsLoggedInServicePath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub: {
        ...modulesCacheStub,
        [platformSdkPath]: {
          ...platformSdkStub,
          listTenants: async () => [],
        },
      },
    });
  });

  it('Should be ineffective, when project has monitoring setup with recognized org and app', () => {
    return runServerless(serverlessPath, {
      cwd: awsLoggedInMonitoredServicePath,
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
      await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
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
    return runServerless(serverlessPath, {
      cwd: awsLoggedInWrongOrgServicePath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  it('Should recognize an invalid app and allow to opt out', () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: true },
      list: { appUpdateType: 'skip' },
    });
    return runServerless(serverlessPath, {
      cwd: awsLoggedInWrongAppServicePath,
      lifecycleHookNamesBlacklist,
      modulesCacheStub,
    });
  });

  describe('Monitoring setup', () => {
    const serviceConfigPath = join(awsLoggedInServicePath, 'serverless.yml');
    let originalServiceConfig;
    before(async () => (originalServiceConfig = await readFile(serviceConfigPath)));
    afterEach(() => {
      if (originalServiceConfig) return writeFile(serviceConfigPath, originalServiceConfig);
      return null;
    });

    it('Should setup monitoring for chosen org and app', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup from CLI flags', () => {
    const serviceConfigPath1 = join(awsLoggedInServicePath, 'serverless.yml');
    const serviceConfigPath2 = join(awsLoggedInMonitoredServicePath, 'serverless.yml');
    let originalServiceConfig1;
    let originalServiceConfig2;
    before(async () => {
      originalServiceConfig1 = await readFile(serviceConfigPath1);
      originalServiceConfig2 = await readFile(serviceConfigPath2);
    });
    afterEach(async () => {
      if (originalServiceConfig1) await writeFile(serviceConfigPath1, originalServiceConfig1);
      if (originalServiceConfig2) await writeFile(serviceConfigPath2, originalServiceConfig2);
    });

    it('Should setup monitoring for chosen org and app', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
        cliArgs: ['--org', 'testinteractivecli', '--app', 'other-app'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath1)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });

    it('Should setup monitoring for chosen org and app even if already configured', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInMonitoredServicePath,
        cliArgs: ['--org', 'otherorg', '--app', 'app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath2)));
      expect(serviceConfig.org).to.equal('otherorg');
      expect(serviceConfig.app).to.equal('app-from-flag');
      expect(serverless.service.org).to.equal('otherorg');
      expect(serverless.service.app).to.equal('app-from-flag');
    });

    it('Should not setup monitoring for chosen org and app even if already configured if rejected', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: false },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInMonitoredServicePath,
        cliArgs: ['--org', 'otherorg', '--app', 'app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath2)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
        cliArgs: ['--org', 'invalid-testinteractivecli', '--app', 'irrelevant'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath1)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInMonitoredServicePath,
        cliArgs: ['--org', 'invalid-testinteractivecli', '--app', 'irrelevant'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath2)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInMonitoredServicePath,
        cliArgs: ['--org', 'testinteractivecli', '--app', 'invalid'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath2)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
        cliArgs: ['--org', 'testinteractivecli', '--app', 'invalid'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath1)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath1)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('frominput');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('frominput');
      expect(createAppStub.calledOnce).to.be.true;
      expect(setDefaultDeploymentProfileStub.calledOnce).to.be.true;
    });
  });

  describe('Monitoring setup when invalid org', () => {
    const serviceConfigPath = join(awsLoggedInWrongOrgServicePath, 'serverless.yml');
    let originalServiceConfig;
    before(async () => (originalServiceConfig = await readFile(serviceConfigPath)));
    afterEach(() => {
      if (originalServiceConfig) return writeFile(serviceConfigPath, originalServiceConfig);
      return null;
    });

    it('Should provide a way to setup monitoring with an invalid org setting', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true, shouldUpdateOrg: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInWrongOrgServicePath,
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup when no app', () => {
    const serviceConfigPath = join(awsLoggedInNoAppServicePath, 'serverless.yml');
    let originalServiceConfig;
    before(async () => (originalServiceConfig = await readFile(serviceConfigPath)));
    afterEach(() => {
      if (originalServiceConfig) return writeFile(serviceConfigPath, originalServiceConfig);
      return null;
    });

    it('Should allow to setup app', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { appName: 'other-app' },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInNoAppServicePath,
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup when no app with --app flag', () => {
    const serviceConfigPath = join(awsLoggedInNoAppServicePath, 'serverless.yml');
    let originalServiceConfig;
    before(async () => (originalServiceConfig = await readFile(serviceConfigPath)));
    afterEach(() => {
      if (originalServiceConfig) return writeFile(serviceConfigPath, originalServiceConfig);
      return null;
    });

    it('Should allow to setup app', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInNoAppServicePath,
        cliArgs: ['--app', 'app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInNoAppServicePath,
        cliArgs: ['--app', 'invalid-app-from-flag'],
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });

  describe('Monitoring setup when invalid app', () => {
    const serviceConfigPath = join(awsLoggedInWrongAppServicePath, 'serverless.yml');
    let originalServiceConfig;
    before(async () => (originalServiceConfig = await readFile(serviceConfigPath)));
    afterEach(() => {
      if (originalServiceConfig) return writeFile(serviceConfigPath, originalServiceConfig);
      return null;
    });

    it('Should recognize an invalid app and allow to create it', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: true },
        list: { appUpdateType: 'create' },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInWrongAppServicePath,
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
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
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInWrongAppServicePath,
        lifecycleHookNamesBlacklist,
        modulesCacheStub,
      });
      const serviceConfig = yaml.parse(String(await readFile(serviceConfigPath)));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(serverless.service.org).to.equal('testinteractivecli');
      expect(serverless.service.app).to.equal('other-app');
    });
  });
});
