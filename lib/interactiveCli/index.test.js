'use strict';

const { join } = require('path');
const sinon = require('sinon');
const runServerless = require('@serverless/test/run-serverless');
const { getLoggedInUser, writeConfigFile } = require('@serverless/platform-sdk');
const setAppConfiguration = require('./set-app');

const setupServerless = require('../../test/setupServerless');

const dashboardPluginPath = require.resolve('../../');
const fixturesPath = join(__dirname, 'test/fixtures');
const nonAwsServicePath = join(fixturesPath, 'non-aws-service');

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

describe('interactiveCli: index', function() {
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

  it('Should error, when not at AWS service path and using --app/--org', () => {
    return runServerless(serverlessPath, {
      cwd: nonAwsServicePath,
      cliArgs: ['--org', 'testinteractivecli', '--app', 'other-app'],
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['initialize'],
      modulesCacheStub,
    })
      .then(() => expect('no-error').to.equal('error'))
      .catch(err =>
        expect(err.toString()).to.equal(
          'ServerlessError: Sorry, the provider other  is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.'
        )
      );
  });
});
