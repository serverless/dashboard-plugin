'use strict';

const proxyquire = require('proxyquire');
const { version: pluginVersion } = require('../../package.json');
const { version: sdkVersion } = require('@serverless/platform-sdk/package.json');

const parseDeploymentData = proxyquire('./parse', {
  './getServerlessFilePath': async () => 'serverless.yml',
  'fs-extra': {
    readFile: async () => 'service: foobar',
  },
  'simple-git/promise': () => ({
    checkIsRepo: async () => true,
    getRemotes: async () => [{ name: 'origin', refs: { fetch: 'http://example.com' } }],
    branch: async () => ({ current: '' }),
    raw: async args => {
      if (args[0] === 'show') {
        if (args[2] === '--format=%H') {
          return 'DEADBEEF';
        } else if (args[2] === '--format=%B') {
          return 'commit message';
        } else if (args[2] === '--format=%ae') {
          return 'user@example.com';
        }
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

describe('parseDeploymentData: no git branch', () => {
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
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-est-2' },
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
      getRegion: () => 'us-est-1',
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
      serverlessFileName: 'serverless.yml',
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'service-dev-func': {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
            name: 'func',
            onError: undefined,
            role: undefined,
            runtime: undefined,
            tags: {},
            vpc: {
              securityGroupIds: [],
              subnetIds: [],
            },
          },
          description: null,
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          timeout: undefined,
          type: 'awsLambda',
        },
      },
      layers: {},
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws',
      },
      regionName: 'us-est-1',
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
        },
        {
          custom: {},
          function: 'service-dev-func',
          schedule: 'rate(10 minutes)',
          type: 'schedule',
        },
      ],
      tenantName: 'tenant',
      tenantUid: 'txxx',
      vcs: {
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: sdkVersion,
    });
  });
});
