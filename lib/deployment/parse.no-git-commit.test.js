'use strict';

const { expect } = require('chai');
const path = require('path');
const proxyquire = require('proxyquire');
const { version: pluginVersion } = require('../../package.json');
const platformClientVersion = require('@serverless/platform-client/package').version;

const parseDeploymentData = proxyquire('./parse', {
  'fs-extra': {
    readFile: async () => 'service: foobar',
  },
  'simple-git': () => ({
    checkIsRepo: async () => true,
    getRemotes: async () => [{ name: 'origin', refs: { fetch: 'http://example.com' } }],
    branch: async () => ({ current: 'master' }),
    raw: async (args) => {
      if (args[0] === 'show') {
        throw new Error(
          "fatal: ambiguous argument '': unknown revision or path not in the working tree.\n" +
            "Use '--' to separate paths from revisions, like this:\n" +
            'git <command> [<revision>...] -- [<file>...]\n'
        );
      } else if (args[0] === 'config') {
        return 'origin';
      } else if (args[0] === 'rev-parse') {
        return '';
      }
      throw new Error('unknown raw invocation');
    },
    silent: () => {},
  }),
});

const frameworkVersion = '1.38.0';

describe('parseDeploymentData', () => {
  let getAccountId;
  let request;
  let getStackName;
  let getServiceEndpointRegex;

  beforeEach(() => {
    getAccountId = () => 'account-id';
    request = async () => ({
      Stacks: [
        {
          Outputs: [
            {
              OutputKey: 'EnterpriseLogAccessIamRole',
              OutputValue: 'arn:aws:iam::111111111111:role/foobarRole',
            },
            {
              OutputKey: 'apig',
              OutputValue: 'https://api-id.execute.aws.amazon.com',
            },
            {
              OutputKey: 'apigWebsocket',
              OutputValue: 'wss://api-id.execute.aws.amazon.com',
            },
            {
              OutputKey: 'SFEOutputapig',
              OutputValue: 'api-id',
            },
          ],
        },
      ],
    });
    getStackName = () => 'stackname';
    getServiceEndpointRegex = () => 'apig';
  });

  it('creates a deployment object correctly w/ no plugins', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
      serviceDir: '/',
      configurationFilename: 'serverless.yml',
      service: {
        orgUid: 'oxxx',
        org: 'org',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-east-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ http: { path: '/', method: 'get' } }, { schedule: 'rate(10 minutes)' }],
          },
        },
        outputs: { foo: 'bar', apig: 'CFN!?SFEOutputapig' },
      },
    };
    const provider = {
      getAccountId,
      request,
      naming: {
        getStackName,
        getServiceEndpointRegex,
      },
      getStage: () => 'dev',
      getRegion: () => 'us-east-1',
    };
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret']),
    };

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state });

    expect(deployment.get()).to.deep.equal({
      buildId: undefined,
      deploymentUid: undefined,
      serverlessFile: 'service: foobar',
      serverlessFileName: path.resolve('/serverless.yml'), // Ensure to resolve "C:\" on Windows
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'service-dev-func': {
          custom: {
            awsKmsKeyArn: null,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: null,
            name: 'func',
            onError: null,
            role: null,
            runtime: null,
            tags: {},
            vpc: {
              securityGroupIds: [],
              subnetIds: [],
            },
          },
          description: null,
          arn: 'arn:aws:lambda:us-east-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          timeout: null,
          type: 'awsLambda',
        },
      },
      layers: {},
      logIngestMode: 'push',
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws',
      },
      areProvidersUsed: false,
      regionName: 'us-east-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      outputs: { foo: 'bar', apig: 'api-id' },
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          cors: undefined,
          custom: {},
          function: 'service-dev-func',
          integration: undefined,
          method: 'get',
          path: '/',
          restApiId: 'api-id',
          type: 'http',
          authorizer: undefined,
          timeout: undefined,
        },
        {
          custom: {},
          function: 'service-dev-func',
          schedule: 'rate(10 minutes)',
          type: 'schedule',
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });
});
