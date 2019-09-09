'use strict';

const { version: pluginVersion } = require('../../package.json');
const { version: sdkVersion } = require('@serverless/platform-sdk/package.json');
const parseDeploymentData = require('./parse');

const frameworkVersion = '1.38.0';

jest.mock('./getServerlessFilePath', () =>
  jest.fn().mockReturnValue(Promise.resolve('serverless.yml'))
);
jest.mock('fs-extra', () => ({
  readFile: jest.fn().mockReturnValue(Promise.resolve('service: foobar')),
}));
jest.mock('simple-git/promise', () => () => ({
  checkIsRepo: jest.fn().mockReturnValue(Promise.resolve(true)),
  getRemotes: jest
    .fn()
    .mockReturnValue(Promise.resolve([{ name: 'origin', refs: { fetch: 'http://example.com' } }])),
  branch: jest.fn().mockReturnValue(Promise.resolve({ current: 'master' })),
  raw: jest.fn().mockImplementation(async args => {
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
  }),
  silent: jest.fn().mockReturnValue(),
}));

describe('parseDeploymentData', () => {
  let getAccountId;
  let request;
  let getStackName;
  let getServiceEndpointRegex;

  beforeEach(() => {
    getAccountId = jest.fn().mockReturnValue('account-id');
    request = jest.fn().mockReturnValueOnce(
      Promise.resolve({
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
      })
    );
    getStackName = jest.fn().mockReturnValue('stackname');
    getServiceEndpointRegex = jest.fn().mockReturnValue('apig');
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
      getStage: jest.fn().mockReturnValue('dev'),
      getRegion: jest.fn().mockReturnValue('us-est-1'),
    };
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret']),
    };

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state });

    expect(deployment.get()).to.deep.equal({
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
        branch: 'master',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: sdkVersion,
    });
  });
});
