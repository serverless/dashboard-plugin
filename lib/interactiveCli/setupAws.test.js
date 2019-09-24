'use strict';

const { join } = require('path');
const os = require('os');

const sinon = require('sinon');
const { lstat, readFile, remove, writeFile } = require('fs-extra');
const cjsResolve = require('ncjsm/resolve/sync');
const runServerless = require('@serverless/test/run-serverless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const { getLoggedInUser } = require('@serverless/platform-sdk');

const setupServerless = require('../../test/setupServerless');

const fixturesPath = join(__dirname, 'test/fixtures');
const nonAwsServicePath = join(fixturesPath, 'non-aws-service');
const awsLoggedInServicePath = join(fixturesPath, 'aws-loggedin-service');
const awsMonitoredServicePath = join(fixturesPath, 'aws-monitored-service');
const awsLoggedInMonitoredServicePath = join(fixturesPath, 'aws-loggedin-monitored-service');

const awsPreviewDeploymentProfile = {
  providerCredentials: {
    secretValue: { accessKeyId: 'id', secretAccessKey: 'secret', region: 'region' },
  },
};

const accessKeyId = 'AKIAIOSFODNN7EXAMPLE';
const secretAccessKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

describe('interactiveCli: setupAws (customization)', function() {
  this.timeout(1000 * 60 * 3);

  let serverlessPath;
  let interactiveCliPath;
  let inquirer;
  let resolveFileProfiles;
  let backupIsTTY;
  let dashboardPluginPath;
  let platformSdkStub;
  let modulesCacheStub;
  let platformSdkPath;

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    ({ root: serverlessPath, plugin: dashboardPluginPath } = await setupServerless());
    const inquirerPath = join(serverlessPath, 'lib/plugins/interactiveCli/inquirer');
    inquirer = require(inquirerPath);
    interactiveCliPath = require.resolve(join(serverlessPath, 'lib/plugins/interactiveCli'));

    const createAppStub = sinon.spy(async ({ app }) => ({ appName: app }));
    const setDefaultDeploymentProfileStub = sinon.stub().resolves();
    platformSdkStub = {
      configureFetchDefaults: () => {},
      createApp: createAppStub,
      getAccessKeyForTenant: async () => 'XXXXXXXXX',
      getApps: async () => [{ appName: 'some-aws-service-app' }, { appName: 'other-app' }],
      getDeployProfile: async () => ({}),
      getDeployProfiles: async () => [{ deploymentProfileUid: 'some-deploy-profile' }],
      getLoggedInUser,
      getManagedAccounts: async () => [],
      listTenants: async () => [
        { tenantName: 'testinteractivecli' },
        { tenantName: 'othertenant' },
      ],
      login: sinon.stub().resolves(),
      refreshToken: async () => {},
      setDefaultDeploymentProfile: setDefaultDeploymentProfileStub,
    };
    platformSdkPath = cjsResolve(dashboardPluginPath, '@serverless/platform-sdk').realPath;
    modulesCacheStub = {
      [require.resolve(inquirerPath)]: inquirer,
      [require.resolve(join(serverlessPath, 'lib/utils/openBrowser'))]: async () => {},
      [platformSdkPath]: platformSdkStub,
    };
    ({ resolveFileProfiles } = require(join(serverlessPath, 'lib/plugins/aws/utils/credentials')));
    dashboardPluginPath = require.resolve(dashboardPluginPath);
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
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
      modulesCacheStub,
    }));

  it('Should be ineffective, when not at AWS service', () =>
    runServerless(serverlessPath, {
      cwd: nonAwsServicePath,
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
      modulesCacheStub,
    }));

  it('Should be ineffective, when credentials are set in environment', () =>
    runServerless(serverlessPath, {
      cwd: awsLoggedInMonitoredServicePath,
      env: { AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey },
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
      modulesCacheStub,
    }));

  it("Should not setup if user doesn't want to setup", () => {
    configureInquirerStub(inquirer, { list: { awsSetupType: 'skip' } });
    return runServerless(serverlessPath, {
      cwd: awsLoggedInMonitoredServicePath,
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
      modulesCacheStub,
    });
  });

  describe('AWS config handling', () => {
    const credentialsDirPath = join(os.homedir(), '.aws');

    before(async () => {
      // Abort if credentials are found in home directory
      // (it should not be the case, as home directory is mocked to point temp dir)
      try {
        await lstat(credentialsDirPath);
      } catch (error) {
        if (error.code === 'ENOENT') return;
        throw error;
      }
      throw new Error('Unexpected ~/.aws directory, related tests aborted');
    });

    afterEach(() => remove(credentialsDirPath));

    it('Should setup credentials for users having an AWS account', async () => {
      configureInquirerStub(inquirer, {
        list: { awsSetupType: 'own' },
        confirm: { hasAwsAccount: true },
        input: { generateAwsCredsPrompt: '', accessKeyId, secretAccessKey },
      });
      await runServerless(serverlessPath, {
        cwd: awsLoggedInMonitoredServicePath,
        pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
        modulesCacheStub,
      });
      const profiles = await resolveFileProfiles();
      expect(profiles).to.deep.equal(new Map([['default', { accessKeyId, secretAccessKey }]]));
    });

    it('Should fallback to default flow on expired preview accounts', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldSetupAwsCredentials: true, hasAwsAccount: true },
        input: { generateAwsCredsPrompt: '', accessKeyId, secretAccessKey },
      });
      await runServerless(serverlessPath, {
        cwd: awsLoggedInMonitoredServicePath,
        pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
        modulesCacheStub: {
          ...modulesCacheStub,
          [platformSdkPath]: {
            ...platformSdkStub,
            getManagedAccounts: async () => [{ name: 'awsPreview', status: 'EXPIRED' }],
          },
        },
      });
      const profiles = await resolveFileProfiles();
      expect(profiles).to.deep.equal(new Map([['default', { accessKeyId, secretAccessKey }]]));
    });

    it('Should fallback to default flow on expired preview accounts when started as logged out', async () => {
      configureInquirerStub(inquirer, {
        list: { awsSetupType: 'preview', accessMode: 'login' },
        confirm: { hasAwsAccount: true, shouldEnableMonitoring: false },
        input: { generateAwsCredsPrompt: '', accessKeyId, secretAccessKey },
      });
      await runServerless(serverlessPath, {
        cwd: awsMonitoredServicePath,
        pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
        modulesCacheStub: {
          ...modulesCacheStub,
          [platformSdkPath]: {
            ...platformSdkStub,
            getManagedAccounts: async () => [{ name: 'awsPreview', status: 'EXPIRED' }],
          },
        },
      });
      const profiles = await resolveFileProfiles();
      expect(profiles).to.deep.equal(new Map([['default', { accessKeyId, secretAccessKey }]]));
    });
  });

  it('Should setup aws preview account on monitored service', async () => {
    configureInquirerStub(inquirer, {
      list: { awsSetupType: 'preview' },
    });
    const serverless = await runServerless(serverlessPath, {
      cwd: awsLoggedInMonitoredServicePath,
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
      modulesCacheStub: {
        ...modulesCacheStub,
        [platformSdkPath]: {
          ...platformSdkStub,
          getDeployProfile: async () => awsPreviewDeploymentProfile,
        },
      },
      hooks: {
        before: () =>
          (require(dashboardPluginPath).prototype.asyncInit = async function() {
            this.provider = this.sls.getProvider('aws');
          }),
      },
    });
    expect(serverless.getProvider('aws').cachedCredentials).to.deep.equal({
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      region: 'us-east-1',
    });
  });

  it('Should ensure user is logged in', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldEnableMonitoring: false },
      list: { awsSetupType: 'preview', accessMode: 'login' },
    });
    const serverless = await runServerless(serverlessPath, {
      cwd: awsMonitoredServicePath,
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
      modulesCacheStub: {
        ...modulesCacheStub,
        [platformSdkPath]: {
          ...platformSdkStub,
          getDeployProfile: async () => awsPreviewDeploymentProfile,
        },
      },
    });
    expect(serverless.getProvider('aws').cachedCredentials).to.deep.equal({
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      region: 'us-east-1',
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
    it('Should ensure monitoring is setup', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldEnableMonitoring: false },
        list: { awsSetupType: 'preview', tenantName: 'testinteractivecli', appName: 'other-app' },
      });
      const serverless = await runServerless(serverlessPath, {
        cwd: awsLoggedInServicePath,
        pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
        lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
        modulesCacheStub: {
          ...modulesCacheStub,
          [platformSdkPath]: {
            ...platformSdkStub,
            getDeployProfile: async () => awsPreviewDeploymentProfile,
          },
        },
      });
      expect(serverless.getProvider('aws').cachedCredentials).to.deep.equal({
        accessKeyId: 'id',
        secretAccessKey: 'secret',
        region: 'us-east-1',
      });
    });
  });
});
