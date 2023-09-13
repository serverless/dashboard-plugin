'use strict';

const { expect } = require('chai');
const wait = require('timers-ext/promise/sleep');
const awsRequest = require('@serverless/test/aws-request');
const CloudWatchLogsService = require('aws-sdk').CloudWatchLogs;
const LambdaService = require('aws-sdk').Lambda;
const hasFailed = require('@serverless/test/has-failed');
const log = require('log').get('test');
const { ServerlessSDK } = require('@serverless/platform-client');
const spawn = require('child-process-ext/spawn');
const fixturesEngine = require('../test/fixtures');
const setupServerless = require('../test/setup-serverless');

describe('integration: wrapper', () => {
  let lambdaService;
  let cloudwatchLogsService;
  let serviceName;
  let serviceDir;
  let serverlessExec;
  let isDeployed;
  const org = process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration';

  const resolveFunctionInvocationLogs = async (functionName, requestId, options = {}) => {
    const logMessages = (
      await awsRequest(cloudwatchLogsService, 'filterLogEvents', {
        logGroupName: `/aws/lambda/${functionName}`,
      })
    ).events.map(({ message }) => message);
    const startLogIndex = logMessages.findIndex((message) =>
      message.includes(`START RequestId: ${requestId}`)
    );
    const endLogIndex = logMessages.findIndex((message) =>
      message.includes(`END RequestId: ${requestId}`)
    );
    if (endLogIndex === -1) {
      await wait(1000);
      return resolveFunctionInvocationLogs(functionName, requestId, options);
    }
    if (!options.containsDataLog) {
      return logMessages.slice(startLogIndex, endLogIndex + 1).join('');
    }
    const dataLogIndex =
      startLogIndex +
      logMessages
        .slice(startLogIndex)
        .findIndex((message) => message.includes('SERVERLESS_ENTERPRISE'));

    if (dataLogIndex === -1) {
      const timeoutTime = options.timeoutTime || Date.now() + 10 * 60 * 1000;
      if (Date.now() > timeoutTime) {
        throw new Error('Data (SERVERLESS_ENTERPRISE) log not recorded as expected');
      }
      return resolveFunctionInvocationLogs(functionName, requestId, { ...options, timeoutTime });
    }
    return logMessages.slice(startLogIndex, Math.max(endLogIndex, dataLogIndex) + 1).join('');
  };

  const resolveLog = async (functionName, encodedLogMsg, options = {}) => {
    let invocationLogs = String(Buffer.from(encodedLogMsg, 'base64'));
    const requestId = invocationLogs.match(/END RequestId: ([a-f0-9-]+)/)[1];
    if (
      !invocationLogs.includes('START RequestId:') ||
      (options.containsDataLog && !invocationLogs.includes('SERVERLESS_ENTERPRISE'))
    ) {
      // Received incomplete logs
      // ("Logtype: 'Tail' guarantees to return only the last 4 KB of the logs)
      // In this case retrieve request logs form Cloudwatch log directly
      log.debug('incomplete log buffer %s', invocationLogs);
      invocationLogs = await resolveFunctionInvocationLogs(functionName, requestId, options);
    }

    log.debug('log buffer %s', invocationLogs);
    return invocationLogs;
  };

  before(async () => {
    const sdk = new ServerlessSDK({
      platformStage: process.env.SERVERLESS_PLATFORM_STAGE || 'dev',
      accessKey: process.env.SERVERLESS_ACCESS_KEY,
    });
    const orgResult = await sdk.organizations.get({ orgName: org });
    let orgUid;
    if (orgResult.orgUid) {
      orgUid = orgResult.orgUid;
    } else {
      throw new Error(`Unable to fetch org details for ${org}. Result: ${orgResult}`);
    }
    const listProvidersResult = await sdk.getProviders(orgUid);
    let listedProviders;
    if (listProvidersResult.result) {
      listedProviders = listProvidersResult.result;
    } else {
      throw new Error(`Unable to list providers for ${org}. Result: ${listProvidersResult.errors}`);
    }
    const defaultProvider = listedProviders.find((provider) => provider.isDefault);
    if (!defaultProvider) {
      throw new Error(`Unable to find default provider in: ${listedProviders}`);
    }
    const providerCredentials = await sdk.getProvider(orgUid, defaultProvider.providerUid);
    let providerDetails;
    if (providerCredentials.result) {
      ({ providerDetails } = providerCredentials.result);
    } else {
      throw new Error(`Unable to fetch providers: ${providerCredentials.errors}`);
    }
    lambdaService = {
      client: LambdaService,
      params: {
        region: process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1',
        credentials: providerDetails,
      },
    };

    cloudwatchLogsService = {
      client: CloudWatchLogsService,
      params: lambdaService.params,
    };

    const app = process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration';
    const stage = process.env.SERVERLESS_PLATFORM_TEST_STAGE || 'dev';
    const region = process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1';
    const result = await Promise.all([
      fixturesEngine.setup('wrapper-service', {
        configExt: {
          org,
          app,
          provider: { stage, region },
          functions: {
            getDashboardUrl: { environment: { ORG: org, APP: app, STAGE: stage, REGION: region } },
            pythonDashboardUrl: {
              environment: { ORG: org, APP: app, STAGE: stage, REGION: region },
            },
          },
        },
      }),
      setupServerless().then((data) => data.binary),
    ]);
    serviceDir = result[0].servicePath;
    serviceName = result[0].serviceConfig.service;
    serverlessExec = result[1];
    await result[0].updateConfig({
      functions: {
        getDashboardUrl: { environment: { SERVICE: serviceName } },
        pythonDashboardUrl: { environment: { SERVICE: serviceName } },
      },
    });
    await spawn(serverlessExec, ['deploy'], { cwd: serviceDir });
    isDeployed = true;
  });

  after(async function () {
    // Do not remove on fail, to allow further investigation
    if (!isDeployed || hasFailed(this.test.parent)) return;
    await spawn(serverlessExec, ['remove'], { cwd: serviceDir });
  });

  it('gets right return value from unresolved handler', async () => {
    const functionName = `${serviceName}-dev-unresolved`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal(null);
  });

  it('gets right return value from wrapped syncError handler', async () => {
    const functionName = `${serviceName}-dev-syncError`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload).errorMessage).to.equal('syncError');
  });

  it('gets right return value from wrapped async handler', async () => {
    const functionName = `${serviceName}-dev-async`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('asyncReturn');
  });

  it('gets right return value from wrapped asyncError handler', async () => {
    const functionName = `${serviceName}-dev-asyncError`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload).errorMessage).to.equal('asyncError');
  });

  it('gets right return value from wrapped asyncDanglingCallback handler', async () => {
    const functionName = `${serviceName}-dev-asyncDanglingCallback`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('asyncDanglyReturn');
  });

  it('gets right return value from wrapped done handler', async () => {
    const functionName = `${serviceName}-dev-done`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('doneReturn');
  });

  it('gets right return value from wrapped doneError handler', async () => {
    const functionName = `${serviceName}-dev-doneError`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload).errorMessage).to.equal('doneError');
  });

  it('gets right return value from wrapped callback handler', async () => {
    const functionName = `${serviceName}-dev-callback`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('callbackReturn');
  });

  it('gets right return value from wrapped callback handler with dangling events but callbackWaitsForEmptyEventLoop=false', async () => {
    const functionName = `${serviceName}-dev-noWaitForEmptyLoop`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('noWaitForEmptyLoop');
  });

  it('gets right return value from wrapped callbackError handler', async () => {
    const functionName = `${serviceName}-dev-callbackError`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload).errorMessage).to.equal('callbackError');
  });

  it('gets right return value from wrapped fail handler', async () => {
    const functionName = `${serviceName}-dev-fail`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload).errorMessage).to.equal('failError');
  });

  it('gets right return value from wrapped succeed handler', async () => {
    const functionName = `${serviceName}-dev-succeed`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('succeedReturn');
  });

  it('gets no SFE log msg from unresolved handler', async () => {
    const functionName = `${serviceName}-dev-unresolved`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logMsg = await resolveLog(functionName, LogResult);
    expect(logMsg).to.not.match(/SERVERLESS_ENTERPRISE/);
  });

  it('gets the callback return value when a promise func calls callback', async () => {
    const functionName = `${serviceName}-dev-promise-and-callback-race`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('callbackEarlyReturn');
  });

  it('gets the return value when calling python', async () => {
    const functionName = `${serviceName}-dev-pythonSuccess`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    expect(JSON.parse(Payload)).to.equal('success');
  });

  it('gets the error value when calling python error', async () => {
    const functionName = `${serviceName}-dev-pythonError`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    await resolveLog(functionName, LogResult); // Expose debug logs
    const payload = JSON.parse(Payload);
    expect(payload.stackTrace[0]).to.match(
      / *File "\/var\/task\/serverless_sdk\/__init__.py", line \d+, in wrapped_handler\n *return user_handler\(event, context\)\n/
    );
    expect(payload.stackTrace[1]).to.match(
      / *File "\/var\/task\/handler.py", line \d+, in error\n *raise Exception\('error'\)\n/
    );
    delete payload.stackTrace;
    expect(payload).to.deep.equal({
      errorMessage: 'error',
      errorType: 'Exception',
    });
  });
});
