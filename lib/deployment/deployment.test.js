'use strict';

const sinon = require('sinon');
const { expect } = require('chai');
const proxyquire = require('proxyquire');
const platformClientVersion = require('@serverless/platform-client/package').version;

describe('lib/deployment/deployment.test.js', () => {
  const frameworkDeploymentCreateStub = sinon.stub().resolves();

  const Deployment = proxyquire('./deployment', {
    '../clientUtils': {
      getPlatformClientWithAccessKey: async () => ({
        frameworkDeployments: {
          create: frameworkDeploymentCreateStub,
        },
      }),
    },
  });

  it('constructs instance with correct defaults', () => {
    const deployment = new Deployment();
    expect(deployment.data).to.deep.equal({
      versionFramework: null,
      versionEnterprisePlugin: null,
      versionSDK: platformClientVersion,
      serverlessFile: null,
      serverlessFileName: null,
      tenantUid: null,
      appUid: null,
      tenantName: null,
      appName: null,
      serviceName: null,
      stageName: null,
      regionName: null,
      logsRoleArn: null,
      status: null,
      error: null,
      archived: false,
      provider: { type: 'aws' },
      functions: {},
      subscriptions: [],
      resources: {},
      layers: {},
      plugins: [],
      safeguards: [],
      secrets: [],
      outputs: {},
      custom: {},
    });
  });

  it('get returns the data object', () => {
    const deployment = new Deployment();
    expect(deployment.data).to.deep.equal(deployment.get());
  });

  it('set updates the data object', () => {
    const deployment = new Deployment();
    deployment.set({ versionEnterprisePlugin: '1000000' });
    expect(deployment.data.versionEnterprisePlugin).to.deep.equal('1000000');
  });

  it('setFunction adds to the data object', () => {
    const deployment = new Deployment();
    deployment.setFunction({
      name: 'func',
      description: 'desc',
      custom: {
        handler: 'handler.hello',
      },
    });
    expect(deployment.data.functions).to.deep.equal({
      func: {
        name: 'func',
        description: 'desc',
        type: 'awsLambda',
        timeout: null,
        custom: {
          handler: 'handler.hello',
          memorySize: null,
          runtime: null,
          role: null,
          onError: null,
          awsKmsKeyArn: null,
          tags: {},
          vpc: { securityGroupIds: [], subnetIds: [] },
          layers: [],
        },
      },
    });
  });

  it('setSubscription adds to the data object', () => {
    const deployment = new Deployment();
    deployment.data.functions.func = {};
    deployment.setSubscription({
      type: 'aws.apigateway.http',
      function: 'func',
      custom: {
        path: '/',
        method: 'get',
        restApiId: 'XYZ',
      },
    });
    expect(deployment.data.subscriptions).to.deep.equal([
      {
        type: 'aws.apigateway.http',
        function: 'func',
        custom: {
          path: '/',
          method: 'get',
          restApiId: 'XYZ',
          cors: false,
        },
      },
    ]);
  });

  it('save calls proper client method with deployment data', async () => {
    const unsavedDeployment = new Deployment();
    unsavedDeployment.set({
      tenantName: 'tenant',
      appName: 'app',
      serviceName: 'service',
      stageName: 'stage',
      regionName: 'region',
    });
    await unsavedDeployment.save();
    expect(frameworkDeploymentCreateStub.args[0][0]).to.deep.equal({
      deploymentData: {
        versionFramework: null,
        versionEnterprisePlugin: null,
        versionSDK: platformClientVersion,
        serverlessFile: null,
        serverlessFileName: null,
        tenantUid: null,
        appUid: null,
        tenantName: 'tenant',
        appName: 'app',
        serviceName: 'service',
        stageName: 'stage',
        regionName: 'region',
        logsRoleArn: null,
        status: null,
        error: null,
        archived: false,
        provider: { type: 'aws' },
        functions: {},
        subscriptions: [],
        resources: {},
        layers: {},
        plugins: [],
        safeguards: [],
        secrets: [],
        outputs: {},
        custom: {},
      },
      orgName: 'tenant',
      appName: 'app',
      serviceName: 'service',
      stageName: 'stage',
      regionName: 'region',
    });
  });
});
