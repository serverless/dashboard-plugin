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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [
              { http: { path: '/', method: 'get' } },
              { schedule: 'rate(10 minutes)' },
              { http: 'GET hello' },
              { httpApi: 'GET /items' },
            ],
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
      areProvidersUsed: true,
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
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
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
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
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: 'hello',
          restApiId: 'api-id',
          type: 'http',
        },
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: '/items',
          httpApiId: 'api-id',
          type: 'httpApi',
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly w/ build ID', async () => {
    process.env.SLS_BUILD_ID = 'buildId';
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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [
              { http: { path: '/', method: 'get' } },
              { schedule: 'rate(10 minutes)' },
              { http: 'GET hello' },
              { httpApi: { path: '/customers', method: 'GET' } },
            ],
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
      areProvidersUsed: true,
    };

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state });

    delete process.env.SLS_BUILD_ID;

    expect(deployment.get()).to.deep.equal({
      deploymentUid: undefined,
      buildId: 'buildId',
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
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
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
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
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: 'hello',
          restApiId: 'api-id',
          type: 'http',
        },
        {
          cors: undefined,
          custom: {},
          function: 'service-dev-func',
          integration: undefined,
          method: 'GET',
          path: '/customers',
          httpApiId: 'api-id',
          type: 'httpApi',
          authorizer: undefined,
          timeout: undefined,
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment w custom log role arn and logIngestMode', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
      serviceDir: '/',
      configurationFilename: 'serverless.yml',
      service: {
        custom: {
          enterprise: {
            logAccessIamRole: 'arn:aws:iam::111111111111:role/customRole',
            logIngestMode: 'pull',
          },
        },
        orgUid: 'oxxx',
        org: 'org',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [
              { http: { path: '/', method: 'get' } },
              { schedule: 'rate(10 minutes)' },
              { http: 'GET hello' },
              {
                http: {
                  path: '/me',
                  method: 'POST',
                  authorizer: {
                    name: 'customCognitoAuthorizer',
                    scopes: ['user.id', 'user.email'],
                  },
                },
              },
            ],
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
      areProvidersUsed: true,
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
      custom: {
        enterprise: {
          logAccessIamRole: 'arn:aws:iam::111111111111:role/customRole',
          logIngestMode: 'pull',
        },
      },
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/customRole',
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          timeout: null,
          type: 'awsLambda',
        },
      },
      layers: {},
      logIngestMode: 'pull',
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws',
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
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
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: 'hello',
          restApiId: 'api-id',
          type: 'http',
        },
        {
          cors: undefined,
          custom: {},
          function: 'service-dev-func',
          integration: undefined,
          method: 'POST',
          path: '/me',
          restApiId: 'api-id',
          type: 'http',
          authorizer: {
            name: 'customCognitoAuthorizer',
            scopes: ['user.id', 'user.email'],
          },
          timeout: undefined,
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly w/ simple plugin list', async () => {
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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        plugins: ['foo', 'bar'],
        functions: {
          func: {
            handler: 'func.handler',
            events: [
              { http: { path: '/', method: 'get' } },
              { schedule: 'rate(10 minutes)' },
              { httpApi: { path: '/order/{id}', method: 'GET', timeout: 5 } },
            ],
          },
        },
        outputs: { foo: 'bar' },
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
      areProvidersUsed: true,
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
      logIngestMode: 'push',
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          timeout: null,
          type: 'awsLambda',
        },
      },
      layers: {},
      plugins: ['foo', 'bar'],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws',
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
      outputs: { foo: 'bar' },
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
        {
          cors: undefined,
          custom: {},
          function: 'service-dev-func',
          integration: undefined,
          method: 'GET',
          path: '/order/{id}',
          httpApiId: 'api-id',
          type: 'httpApi',
          authorizer: undefined,
          timeout: 5,
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly w/ plugin object', async () => {
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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        plugins: { modules: ['foo', 'bar'] },
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ http: { path: '/', method: 'get' } }, { schedule: 'rate(10 minutes)' }],
          },
        },
        outputs: { foo: 'bar' },
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
      areProvidersUsed: true,
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          timeout: null,
          type: 'awsLambda',
        },
      },
      layers: {},
      logIngestMode: 'push',
      plugins: ['foo', 'bar'],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws',
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
      outputs: { foo: 'bar' },
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
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly with zeroconf alexaSkill', async () => {
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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: ['alexaSkill'],
          },
        },
        outputs: { foo: 'bar' },
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
      areProvidersUsed: false,
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
          name: 'service-dev-func',
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
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
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: false,
      outputs: { foo: 'bar' },
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          custom: {},
          function: 'service-dev-func',
          type: 'alexaSkill',
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly with websocket', async () => {
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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ websocket: { route: '$connect' } }, { schedule: 'rate(10 minutes)' }],
          },
        },
        outputs: { foo: 'bar' },
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
      areProvidersUsed: false,
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
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
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: false,
      outputs: { foo: 'bar' },
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          custom: {},
          function: 'service-dev-func',
          type: 'websocket',
          websocketApiId: 'api-id',
          route: '$connect',
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
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly without http events', async () => {
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
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: { func: { handler: 'func.handler', name: 'func-custom' } },
        outputs: { foo: 'bar' },
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
      areProvidersUsed: true,
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
        'func-custom': {
          custom: {
            awsKmsKeyArn: null,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: null,
            name: 'func-custom',
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:func-custom',
          name: 'func-custom',
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
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
      outputs: { foo: 'bar' },
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        branch: 'master',
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object correctly on deployment fail of not yet deployed', async () => {
    request = async () => {
      throw Object.assign(new Error('ServerlessError: Stack with id test-4-dev does not exist'), {
        providerError: { statusCode: 400 },
      });
    };
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
      serverlessFileName: path.resolve('/serverless.yml'), // Ensure to resolve "C:\" on Windows
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: null,
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
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
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: false,
      outputs: { foo: 'bar' },
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          custom: {},
          function: 'service-dev-func',
          method: 'get',
          path: '/',
          type: 'http',
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
        commit: 'DEADBEEF',
        commitMessage: 'commit message',
        committerEmail: 'user@example.com',
        originUrl: 'http://example.com',
        relativePath: '',
        type: 'git',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('creates a deployment object with vcs data from ci/cd env', async () => {
    const savedEnv = Object.assign({}, process.env);
    Object.assign(process.env, {
      SERVERLESS_BUILD_ID: 'buildId',
      SERVERLESS_CI_CD: 'true',
      SERVERLESS_REPO: 'serverless/hello-world',
      SERVERLESS_BRANCH: 'master',
      SERVERLESS_PULL_REQUEST: '7',
      SERVERLESS_COMMIT_USER: 'serverless',
      SERVERLESS_COMMIT_SHA: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      SERVERLESS_COMMIT_MSG: 'fix all the bugs',
      SERVERLESS_DEPLOY_TYPE: 'preview',
      SERVERLESS_ROOT_PATH: '/service',
    });

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
        provider: { stage: 'qa', region: 'us-west-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ http: { path: '/knock', method: 'post' } }],
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
      getStage: () => 'qa',
      getRegion: () => 'us-west-2',
    };
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret']),
      areProvidersUsed: true,
    };

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state });

    process.env = savedEnv;

    expect(deployment.get()).to.deep.equal({
      deploymentUid: undefined,
      buildId: 'buildId',
      serverlessFile: 'service: foobar',
      serverlessFileName: path.resolve('/serverless.yml'), // Ensure to resolve "C:\" on Windows
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'service-qa-func': {
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
          arn: 'arn:aws:lambda:us-west-2:account-id:function:service-qa-func',
          name: 'service-qa-func',
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
      regionName: 'us-west-2',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      areProvidersUsed: true,
      outputs: { foo: 'bar', apig: 'api-id' },
      serviceName: 'service',
      stageName: 'qa',
      status: 'success',
      subscriptions: [
        {
          cors: undefined,
          custom: {},
          function: 'service-qa-func',
          integration: undefined,
          method: 'post',
          path: '/knock',
          restApiId: 'api-id',
          type: 'http',
          authorizer: undefined,
          timeout: undefined,
        },
      ],
      tenantName: 'org',
      tenantUid: 'oxxx',
      vcs: {
        type: 'git',
        repository: 'serverless/hello-world',
        branch: 'master',
        pullRequest: '7',
        commit: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
        commitMessage: 'fix all the bugs',
        committer: 'serverless',
        deployType: 'preview',
        relativePath: '/service',
      },
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: platformClientVersion,
    });
  });

  it('adds vcs data from ci/cd env to deployment record of a removal', async () => {
    const savedEnv = Object.assign({}, process.env);
    Object.assign(process.env, {
      SERVERLESS_BUILD_ID: 'buildId',
      SERVERLESS_CI_CD: 'true',
      SERVERLESS_REPO: 'serverless/hello-world',
      SERVERLESS_BRANCH: 'master',
      SERVERLESS_COMMIT_USER: 'serverless',
      SERVERLESS_COMMIT_SHA: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      SERVERLESS_COMMIT_MSG: 'fix all the bugs',
      SERVERLESS_DEPLOY_TYPE: 'destroy',
      SERVERLESS_ROOT_PATH: '/service',
    });

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
        provider: { stage: 'qa', region: 'us-west-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ http: { path: '/knock', method: 'post' } }],
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
      getStage: () => 'qa',
      getRegion: () => 'us-west-2',
    };
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret']),
      areProvidersUsed: true,
    };

    const deployment = await parseDeploymentData(
      { sls: serverless, serverless, provider, state },
      'success',
      null,
      true
    );

    process.env = savedEnv;

    expect(deployment.get()).to.deep.equal({
      buildId: 'buildId',
      versionFramework: frameworkVersion,
      versionEnterprisePlugin: pluginVersion,
      versionSDK: platformClientVersion,
      tenantUid: 'oxxx',
      appUid: 'axxx',
      tenantName: 'org',
      appName: 'app',
      serviceName: 'service',
      stageName: 'qa',
      regionName: 'us-west-2',
      archived: true,
      status: 'success',
      secrets: ['secret'],
      areProvidersUsed: true,
      error: null,
      vcs: {
        type: 'git',
        repository: 'serverless/hello-world',
        branch: 'master',
        pullRequest: undefined,
        commit: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
        commitMessage: 'fix all the bugs',
        committer: 'serverless',
        deployType: 'destroy',
        relativePath: '/service',
      },
      resources: {},
      safeguards: [],
      provider: {
        type: 'aws',
      },
      plugins: [],
      outputs: {},
      logsRoleArn: null,
      layers: {},
      functions: {},
      custom: {},
      serverlessFile: null,
      serverlessFileName: null,
      subscriptions: [],
    });
  });
});

const runServerless = require('../../test/run-serverless');

describe('parseDeploymentData #2', () => {
  it('Should support sumple-git v2.5', async () => {
    // See https://github.com/steveukx/git-js/issues/512
    const modulesCacheStub = {
      [require.resolve('@serverless/utils/config')]: {
        ...require('@serverless/utils/config'),
        getLoggedInUser: () => ({
          accessKeys: { testinteractivecli: 'accesskey' },
        }),
      },
      '@serverless/utils/api-request': async () => [
        {
          vendorAccount: '377024778620',
        },
      ],
      [require.resolve('@serverless/platform-client')]: {
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
              get: async () => {
                return {
                  appUid: 'appUid',
                  tenantUid: 'orgUid',
                };
              },
            };

            this.deploymentProfiles = {
              get: () => ({}),
            };

            this.frameworkDeployments = {
              create: async () => ({}),
            };

            this.organizations = {
              get: async () => ({}),
            };
          }
        },
      },
      [require.resolve('simple-git/promise')]: () => ({
        checkIsRepo: async () => true,
        getRemotes: async () => [{ name: 'origin' }],
        branch: async () => ({ current: 'master' }),
        raw: async (args) => {
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
    };

    const awsRequestStubMap = {
      CloudFormation: {
        createChangeSet: {},
        deleteChangeSet: {},
        describeChangeSet: {
          ChangeSetName: 'new-service-dev-change-set',
          ChangeSetId: 'some-change-set-id',
          StackName: 'new-service-dev',
          Status: 'CREATE_COMPLETE',
        },
        describeStackEvents: {
          StackEvents: [
            {
              ResourceStatus: 'UPDATE_COMPLETE',
              ResourceType: 'AWS::CloudFormation::Stack',
            },
          ],
        },
        describeStacks: { Stacks: [{ Outputs: [] }] },
        describeStackResource: {
          StackResourceDetail: { PhysicalResourceId: 'deployment-bucket' },
        },
        executeChangeSet: {},
        listStackResources: {},
        updateStack: 'alreadyCreated',
        validateTemplate: {},
      },
      Lambda: {
        getFunction: {
          Configuration: {
            LastModified: '2020-05-20T15:34:16.494+0000',
          },
        },
      },
      S3: {
        headBucket: {},
        headObject: {
          Metadata: { filesha256: 'RRYyTm4Ri8mocpvx44pvas4JKLYtdJS3Z8MOlrZrDXA=' },
        },
        listObjectsV2: {
          Contents: [
            {
              Key: 'serverless/test-package-artifact/dev/1589988704359-2020-05-20T15:31:44.359Z/artifact.zip',
              LastModified: new Date(),
              ETag: '"5102a4cf710cae6497dba9e61b85d0a4"',
              Size: 356,
              StorageClass: 'STANDARD',
            },
          ],
        },
        upload: {},
      },
      STS: {
        getCallerIdentity: {
          ResponseMetadata: { RequestId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
          UserId: 'XXXXXXXXXXXXXXXXXXXXX',
          Account: '999999999999',
          Arn: 'arn:aws:iam::999999999999:user/test',
        },
      },
    };
    await runServerless({
      fixture: 'aws-loggedin-monitored-service',
      command: 'deploy',
      modulesCacheStub,
      awsRequestStubMap,
    });
  });
});
