'use strict';

const { expect } = require('chai');
const zlib = require('zlib');
const wait = require('timers-ext/promise/sleep');
const awsRequest = require('@serverless/test/aws-request');
const hasFailed = require('@serverless/test/has-failed');
const log = require('log').get('test');
const { ServerlessSDK } = require('@serverless/platform-client');
const spawn = require('child-process-ext/spawn');
const fixturesEngine = require('../test/fixtures');
const setupServerless = require('../test/setupServerless');

describe('integration: wrapper', () => {
  let lambdaService;
  let cloudwatchLogsService;
  let serviceName;
  let serviceDir;
  let serverlessExec;
  let isDeployed;
  const org = process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration';

  const resolveFunctionInvocationLogs = async (functionName, requestId) => {
    const logs = (
      await awsRequest(cloudwatchLogsService, 'filterLogEvents', {
        logGroupName: `/aws/lambda/${functionName}`,
      })
    ).events
      .map(({ message }) => message)
      .join('');
    const invocationLastLog = `END RequestId: ${requestId}`;
    if (!logs.includes(invocationLastLog)) {
      await wait(1000);
      return resolveFunctionInvocationLogs(functionName, requestId);
    }

    return logs.slice(
      logs.indexOf(`START RequestId: ${requestId}`),
      logs.indexOf(invocationLastLog) + invocationLastLog.length
    );
  };

  const resolveLog = async (functionName, encodedLogMsg) => {
    let invocationLogs = String(Buffer.from(encodedLogMsg, 'base64'));
    if (!invocationLogs.includes('START RequestId:')) {
      // Received incomplete logs
      // ("Logtype: 'Tail' guarantees to return only the last 4 KB of the logs)
      // In this case retrieve request logs form Cloudwatch log directly
      log.debug('incomplete log buffer %s', invocationLogs);
      invocationLogs = await resolveFunctionInvocationLogs(
        functionName,
        invocationLogs.match(/END RequestId: ([a-f0-9-]+)/)[1]
      );
    }
    log.debug('log buffer %s', invocationLogs);
    return invocationLogs;
  };

  const resolveAndValidateLog = async (functionName, encodedLogMsg) => {
    const logMsg = await resolveLog(functionName, encodedLogMsg);
    expect(logMsg).to.match(/SERVERLESS_ENTERPRISE/);
    const logLine = logMsg.split('\n').find((line) => line.includes('SERVERLESS_ENTERPRISE'));
    const payloadString = logLine.split('SERVERLESS_ENTERPRISE')[1].split('END RequestId')[0];
    const result = (() => {
      try {
        return JSON.parse(payloadString);
      } catch (error) {
        throw new Error(`Resolved log payload is not a valid JSON: ${payloadString}`);
      }
    })();
    if (result.b) {
      const zipped = Buffer.from(result.b, 'base64');
      const unzipped = JSON.parse(zlib.gunzipSync(zipped));
      log.debug('unzipped %o', unzipped);
      return unzipped;
    }
    return result;
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
      name: 'Lambda',
      params: {
        region: process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1',
        credentials: providerDetails,
      },
    };

    cloudwatchLogsService = {
      name: 'CloudWatchLogs',
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

  it('gets SFE log msg from wrapped syncError handler', async () => {
    const functionName = `${serviceName}-dev-syncError`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":"Error!\$syncError"/);
  });

  it('gets SFE log msg from wrapped async handler', async () => {
    const functionName = `${serviceName}-dev-async`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped asyncError handler', async () => {
    const functionName = `${serviceName}-dev-asyncError`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":"Error!\$asyncError"/);
  });

  it('gets SFE log msg from wrapped asyncDanglingCallback handler', async () => {
    const functionName = `${serviceName}-dev-asyncDanglingCallback`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped done handler', async () => {
    const functionName = `${serviceName}-dev-done`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped doneError handler', async () => {
    const functionName = `${serviceName}-dev-doneError`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":"NotAnErrorType!\$doneError"/);
  });

  it('gets SFE log msg from wrapped callback handler', async () => {
    const functionName = `${serviceName}-dev-callback`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped callbackError handler', async () => {
    const functionName = `${serviceName}-dev-callbackError`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":"NotAnErrorType!\$callbackError"/);
  });

  it('gets SFE log msg from wrapped fail handler', async () => {
    const functionName = `${serviceName}-dev-fail`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":"NotAnErrorType!\$failError"/);
  });

  it('gets SFE log msg from wrapped succeed handler', async () => {
    const functionName = `${serviceName}-dev-succeed`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
  });

  it('gets right duration value from wrapped callback handler', async () => {
    const functionName = `${serviceName}-dev-callback`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const logResult = await resolveAndValidateLog(functionName, LogResult);
    const duration = parseFloat(JSON.stringify(logResult).match(/"duration":(\d+\.\d+)/)[1]);
    expect(duration).to.be.above(5);
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

  it('gets spans', async () => {
    const functionName = `${serviceName}-dev-spans`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.spans.length).to.equal(5);
    // first custom span (create sts client)
    expect(new Set(Object.keys(payload.payload.spans[0]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(payload.payload.spans[0].tags).to.deep.equal({
      type: 'custom',
      label: 'create sts client',
    });
    // aws span
    expect(new Set(Object.keys(payload.payload.spans[1]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(new Set(Object.keys(payload.payload.spans[1].tags.aws))).to.deep.equal(
      new Set(['errorCode', 'operation', 'region', 'requestId', 'service'])
    );
    expect(payload.payload.spans[1].tags.type).to.equal('aws');
    // first http span (POST w/ https.request)
    expect(new Set(Object.keys(payload.payload.spans[2]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(payload.payload.spans[2].tags).to.deep.equal({
      type: 'http',
      requestHostname: 'httpbin.org',
      requestPath: '/post',
      httpMethod: 'POST',
      httpStatus: 200,
    });
    // second http span (https.get)
    expect(new Set(Object.keys(payload.payload.spans[3]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(payload.payload.spans[3].tags).to.deep.equal({
      type: 'http',
      requestHostname: 'httpbin.org',
      requestPath: '/get',
      httpMethod: 'GET',
      httpStatus: 200,
    });
    // second custom span (asynctest)
    expect(new Set(Object.keys(payload.payload.spans[4]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(payload.payload.spans[4].tags).to.deep.equal({
      type: 'custom',
      label: 'asynctest',
    });
  });

  it('gets SFE log msg from wrapped node timeout handler', async () => {
    const functionName = `${serviceName}-dev-timeout`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('report');
  });

  it('gets SFE log msg from wrapped node timeout handler with callbackWaitsForEmptyEventLoop true', async () => {
    const functionName = `${serviceName}-dev-waitForEmptyLoop`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('report');
  });

  it('gets the current transaction id in wrapped node handler', async () => {
    const functionName = `${serviceName}-dev-getTransactionId`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
  });

  it('gets dashboard url for current transaction in wrapped node handler', async () => {
    const functionName = `${serviceName}-dev-getDashboardUrl`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
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

  it('gets SFE log msg from wrapped python handler', async () => {
    const functionName = `${serviceName}-dev-pythonSuccess`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.spans.length).to.equal(3);
    expect(new Set(Object.keys(payload.payload.spans[0]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(payload.payload.spans[0].tags).to.deep.equal({
      type: 'custom',
      label: 'create sts client',
    });
    expect(new Set(Object.keys(payload.payload.spans[1]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(new Set(Object.keys(payload.payload.spans[1].tags.aws))).to.deep.equal(
      new Set(['errorCode', 'operation', 'region', 'requestId', 'service'])
    );
    expect(payload.payload.spans[1].tags.type).to.equal('aws');
    expect(new Set(Object.keys(payload.payload.spans[2]))).to.deep.equal(
      new Set(['duration', 'endTime', 'startTime', 'tags'])
    );
    expect(payload.payload.spans[2].tags).to.deep.equal({
      type: 'http',
      requestHostname: 'httpbin.org',
      requestPath: '/get',
      httpMethod: 'GET',
      httpStatus: 200,
    });
  });

  it('gets http connection errors from python', async () => {
    const functionName = `${serviceName}-dev-pythonHttpError`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.spans.length).to.equal(1);
    expect(payload.payload.spans[0].tags).to.deep.equal({
      type: 'http',
      requestHostname: 'asdfkasdjsdf',
      requestPath: '/',
      httpMethod: 'GET',
      httpStatus: 'Exc',
    });
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

  it('gets SFE log msg from wrapped python error handler', async () => {
    const functionName = `${serviceName}-dev-pythonError`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('error');
  });

  it('gets node eventTags', async () => {
    const functionName = `${serviceName}-dev-eventTags`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.eventTags.length).to.equal(1);
    expect(payload.payload.eventTags[0]).to.deep.equal({
      tagName: 'event-tagged',
      tagValue: 'true',
      custom: '{"customerId":5,"userName":"aaron.stuyvenberg"}',
    });
  });

  it('gets python eventTags', async () => {
    const functionName = `${serviceName}-dev-pythonEventTags`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.eventTags.length).to.equal(1);
    expect(payload.payload.eventTags[0]).to.deep.equal({
      tagName: 'event-tagged',
      tagValue: 'true',
      custom: '{"customerId": 5, "userName": "aaron.stuyvenberg"}',
    });
  });

  it('sets node endpoint', async () => {
    const functionName = `${serviceName}-dev-setEndpoint`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.tags.endpoint).to.equal('/test/:param1');
    expect(payload.payload.tags.endpointMechanism).to.equal('explicit');
  });

  it('sets node endpoint along with http metadata', async () => {
    const functionName = `${serviceName}-dev-setEndpointWithHttpMetadata`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.tags.endpoint).to.equal('/test/:param2');
    expect(payload.payload.tags.httpMethod).to.equal('POST');
    expect(payload.payload.tags.httpStatusCode).to.equal('201');
    expect(payload.payload.tags.endpointMechanism).to.equal('explicit');
  });

  it('sets python endpoint', async () => {
    const functionName = `${serviceName}-dev-pythonSetEndpoint`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.tags.endpoint).to.equal('/test/:param');
    expect(payload.payload.tags.httpMethod).to.equal('PATCH');
    expect(payload.payload.tags.httpStatusCode).to.equal('202');
    expect(payload.payload.tags.endpointMechanism).to.equal('explicit');
  });

  it('gets SFE log msg from wrapped python timeout handler', async () => {
    const functionName = `${serviceName}-dev-pythonTimeout`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('report');
  });

  it('supports handler nested in a python submodule', async () => {
    const functionName = `${serviceName}-dev-pythonSubModule`;
    const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const result = await resolveAndValidateLog(functionName, LogResult);
    expect(result.type).to.equal('transaction');
    expect(JSON.parse(Payload)).to.equal('success');
  });

  it('gets the current transaction id in wrapped python handler', async () => {
    const functionName = `${serviceName}-dev-pythonTransactionId`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
  });

  it('gets dashboard url for current transaction in wrapped python handler', async () => {
    const functionName = `${serviceName}-dev-pythonDashboardUrl`;
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: functionName,
    });
    const payload = await resolveAndValidateLog(functionName, LogResult);
    expect(payload.type).to.equal('transaction');
  });
});
