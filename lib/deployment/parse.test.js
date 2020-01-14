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
    branch: async () => ({ current: 'master' }),
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
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: 'hello',
          restApiId: 'api-id',
          type: 'http',
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment object correctly w/ build ID', async () => {
    process.env.SLS_BUILD_ID = 'buildId';
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
    };

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state });

    delete process.env.SLS_BUILD_ID;

    expect(deployment.get()).to.deep.equal({
      deploymentUid: undefined,
      buildId: 'buildId',
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
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: 'hello',
          restApiId: 'api-id',
          type: 'http',
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment w custom log role arn and logIngestMode', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
        {
          custom: {},
          function: 'service-dev-func',
          method: 'GET',
          path: 'hello',
          restApiId: 'api-id',
          type: 'http',
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment object correctly w/ simple plugin list', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
      logIngestMode: 'push',
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
      plugins: ['foo', 'bar'],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws',
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment object correctly w/ plugin object', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment object correctly with zeroconf alexaSkill', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
          name: 'service-dev-func',
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          timeout: undefined,
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment object correctly with websocket', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
      versionSDK: sdkVersion,
    });
  });

  it('creates a deployment object correctly without http events', async () => {
    const serverless = {
      processedInput: { options: {} },
      version: frameworkVersion,
      config: { servicePath: '.' },
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
        'func-custom': {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
            name: 'func-custom',
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
          arn: 'arn:aws:lambda:us-est-1:account-id:function:func-custom',
          name: 'func-custom',
          timeout: undefined,
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
      versionSDK: sdkVersion,
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
      serverlessFileName: 'serverless.yml',
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: null,
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
      versionSDK: sdkVersion,
    });
  });
});
