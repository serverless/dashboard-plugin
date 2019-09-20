'use strict';

const { join } = require('path');
const os = require('os');

const sinon = require('sinon');
const { lstat, readFile, remove, writeFile } = require('fs-extra');
const runServerless = require('@serverless/test/run-serverless');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const { getLoggedInUser } = require('@serverless/platform-sdk');

const setupServerless = require('../../test/setupServerless');

const dashboardPluginPath = require.resolve('../..');
const fixturesPath = join(__dirname, 'test/fixtures');
const nonAwsServicePath = join(fixturesPath, 'non-aws-service');
const awsLoggedInServicePath = join(fixturesPath, 'aws-loggedin-service');
const awsMonitoredServicePath = join(fixturesPath, 'aws-monitored-service');
const awsLoggedInMonitoredServicePath = join(fixturesPath, 'aws-loggedin-monitored-service');

const createAppStub = sinon.spy(async ({ app }) => ({ appName: app }));
const setDefaultDeploymentProfileStub = sinon.stub().resolves();

const awsPreviewDeploymentProfile = {
  providerCredentials: {
    secretValue: { accessKeyId: 'id', secretAccessKey: 'secret', region: 'region' },
  },
};
const platformSdkStub = {
  configureFetchDefaults: () => {},
  createApp: createAppStub,
  getAccessKeyForTenant: async () => 'XXXXXXXXX',
  getApps: async () => [{ appName: 'some-aws-service-app' }, { appName: 'other-app' }],
  getDeployProfile: async () => ({}),
  getDeployProfiles: async () => [{ deploymentProfileUid: 'some-deploy-profile' }],
  getLoggedInUser,
  getManagedAccounts: async () => [],
  listTenants: async () => [{ tenantName: 'testinteractivecli' }, { tenantName: 'othertenant' }],
  login: sinon.stub().resolves(),
  refreshToken: async () => {},
  setDefaultDeploymentProfile: setDefaultDeploymentProfileStub,
};
const modulesCacheStub = {
  [require.resolve('@serverless/platform-sdk')]: platformSdkStub,
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

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    serverlessPath = (await setupServerless()).root;
    const inquirerPath = join(serverlessPath, 'lib/plugins/interactiveCli/inquirer');
    inquirer = require(inquirerPath);
    interactiveCliPath = require.resolve(join(serverlessPath, 'lib/plugins/interactiveCli'));
    modulesCacheStub[require.resolve(inquirerPath)] = inquirer;
    modulesCacheStub[
      require.resolve(join(serverlessPath, 'lib/utils/openBrowser'))
    ] = async () => {};
    ({ resolveFileProfiles } = require(join(serverlessPath, 'lib/plugins/aws/utils/credentials')));
  });
  after(() => {
    process.stdin.isTTY = backupIsTTY;
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
    }));

  it('Should be ineffective, when not at AWS service', () =>
    runServerless(serverlessPath, {
      cwd: nonAwsServicePath,
      pluginPathsWhitelist: [interactiveCliPath, dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['before:interactiveCli:setupAws', 'interactiveCli:setupAws'],
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
          [require.resolve('@serverless/platform-sdk')]: {
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
          [require.resolve('@serverless/platform-sdk')]: {
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
        [require.resolve('@serverless/platform-sdk')]: {
          ...platformSdkStub,
          getDeployProfile: async () => awsPreviewDeploymentProfile,
        },
      },
      hooks: {
        before: () =>
          (require('../../').prototype.asyncInit = async function() {
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
        [require.resolve('@serverless/platform-sdk')]: {
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
          [require.resolve('@serverless/platform-sdk')]: {
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
