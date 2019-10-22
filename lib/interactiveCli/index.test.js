'use strict';

const { join } = require('path');
const sinon = require('sinon');
const runServerless = require('@serverless/test/run-serverless');
const { getLoggedInUser } = require('@serverless/platform-sdk');
const semver = require('semver');
const setAppConfiguration = require('./set-app');

const setupServerless = require('../../test/setupServerless');

const dashboardPluginPath = require.resolve('../../');
const fixturesPath = join(__dirname, 'test/fixtures');
const nonAwsServicePath = join(fixturesPath, 'non-aws-service');
const nonSupportedRuntimeServicePath = join(fixturesPath, 'non-supported-runtime-service');

const platformSdkStub = {
  configureFetchDefaults: () => {},
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
};

describe('interactiveCli: index', function() {
  this.timeout(1000 * 60 * 3);

  let serverlessPath;
  let serverlessVersion;
  let modulesCacheStub;
  let backupIsTTY;

  before(async () => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    const { root, version } = await setupServerless();
    serverlessPath = root;
    serverlessVersion = version;
    modulesCacheStub = {
      [require.resolve('@serverless/platform-sdk')]: platformSdkStub,
    };
    sinon.stub(setAppConfiguration, 'check').resolves(false);
  });
  after(() => {
    process.stdin.isTTY = backupIsTTY;
    sinon.restore();
  });

  afterEach(() => {
    sinon.reset();
  });

  it('Should error, when not at AWS service path and using --app/--org', () => {
    if (semver.lt(serverlessVersion, '1.55.0')) return null; // skip on old sls
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
          'ServerlessError: Sorry, the provider other is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.'
        )
      );
  });

  it('Should error, when unsupported runtime and using --app/--org', () => {
    if (semver.lt(serverlessVersion, '1.55.0')) return null; // skip on old sls
    return runServerless(serverlessPath, {
      cwd: nonSupportedRuntimeServicePath,
      cliArgs: ['--org', 'testinteractivecli', '--app', 'other-app'],
      pluginPathsWhitelist: [dashboardPluginPath],
      lifecycleHookNamesWhitelist: ['initialize'],
      modulesCacheStub,
    })
      .then(() => expect('no-error').to.equal('error'))
      .catch(err =>
        expect(err.toString()).to.equal(
          'ServerlessError: Sorry, the runtime ruby is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.'
        )
      );
  });
});
