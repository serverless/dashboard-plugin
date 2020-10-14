'use strict';

process.env.SERVERLESS_PLATFORM_STAGE = 'dev';

const setup = require('./setup');
const zlib = require('zlib');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const awsRequest = require('@serverless/test/aws-request');
const log = require('log').get('test');

let sls;
let teardown;
let serviceName;
const org = process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration';
const app = process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration';

const resolveLog = (encodedLogMsg) => {
  const logMsg = String(Buffer.from(encodedLogMsg, 'base64'));
  log.debug('log buffer %s', logMsg);
  return logMsg;
};

const resolveAndValidateLog = (encodedLogMsg) => {
  const logMsg = resolveLog(encodedLogMsg);
  expect(logMsg).to.match(/SERVERLESS_ENTERPRISE/);
  const logLine = logMsg.split('\n').find((line) => line.includes('SERVERLESS_ENTERPRISE'));
  const payloadString = logLine.split('SERVERLESS_ENTERPRISE')[1].split('END RequestId')[0];
  const result = JSON.parse(payloadString);
  if (result.b) {
    const zipped = Buffer.from(result.b, 'base64');
    const unzipped = JSON.parse(zlib.gunzipSync(zipped));
    log.debug('unzipped %o', unzipped);
    return unzipped;
  }
  return result;
};

const setupTests = (mode, env = {}) => {
  let lambdaService;

  describe(mode, () => {
    beforeAll(async () => {
      const accessKey = await getAccessKeyForTenant(org);
      lambdaService = {
        name: 'Lambda',
        params: {
          region: process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1',
          credentials: (
            await getDeployProfile({
              tenant: org,
              app,
              stage: 'dev',
              accessKey,
            })
          ).providerCredentials.secretValue,
        },
      };

      ({ sls, teardown, serviceName } = await setup('wrapper-service'));
      await sls(['deploy'], { env });
    });

    afterAll(() => {
      if (teardown) return teardown();
      return null;
    });

    it('gets right return value from unresolved handler', async function () {
      if (env.SLS_DEV_MODE) {
        // In dev mode unresolved lambda will timeout
        // as by design websocket is closed only on lambda resolution
        // and not closing websocket keeps invocation alive
        // (it'll be great to figure out a more gentle form of communication)
        this.skip();
      }
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-unresolved`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal(null);
    });

    it('gets right return value from wrapped syncError handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-syncError`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload).errorMessage).to.equal('syncError');
    });

    it('gets right return value from wrapped async handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-async`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('asyncReturn');
    });

    it('gets right return value from wrapped asyncError handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-asyncError`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload).errorMessage).to.equal('asyncError');
    });

    it('gets right return value from wrapped asyncDanglingCallback handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-asyncDanglingCallback`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('asyncDanglyReturn');
    });

    it('gets right return value from wrapped done handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-done`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('doneReturn');
    });

    it('gets right return value from wrapped doneError handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-doneError`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload).errorMessage).to.equal('doneError');
    });

    it('gets right return value from wrapped callback handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-callback`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('callbackReturn');
    });

    it('gets right return value from wrapped callback handler with dangling events but callbackWaitsForEmptyEventLoop=false', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-noWaitForEmptyLoop`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('noWaitForEmptyLoop');
    });

    it('gets right return value from wrapped callbackError handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-callbackError`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload).errorMessage).to.equal('callbackError');
    });

    it('gets right return value from wrapped fail handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-fail`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload).errorMessage).to.equal('failError');
    });

    it('gets right return value from wrapped succeed handler', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-succeed`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('succeedReturn');
    });

    it('gets no SFE log msg from unresolved handler', async function () {
      // Dashboard log is written either on resolution or right before invocation times out
      // Therefore when lambda ends without resolution log is not written at all
      if (env.SLS_DEV_MODE) {
        // In dev mode unresolved lambda will timeout
        // as by design websocket is closed only on lambda resolution
        // and not closing websocket keeps invocation alive
        // (it'll be great to figure out a more gentle form of communication)
        this.skip();
      }
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-unresolved`,
      });
      const logMsg = resolveLog(LogResult);
      expect(logMsg).to.not.match(/SERVERLESS_ENTERPRISE/);
    });

    it('gets SFE log msg from wrapped syncError handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-syncError`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":"Error!\$syncError"/);
    });

    it('gets SFE log msg from wrapped async handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-async`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
    });

    it('gets SFE log msg from wrapped asyncError handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-asyncError`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":"Error!\$asyncError"/);
    });

    it('gets SFE log msg from wrapped asyncDanglingCallback handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-asyncDanglingCallback`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
    });

    it('gets SFE log msg from wrapped done handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-done`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
    });

    it('gets SFE log msg from wrapped doneError handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-doneError`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":"NotAnErrorType!\$doneError"/);
    });

    it('gets SFE log msg from wrapped callback handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-callback`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
    });

    it('gets SFE log msg from wrapped callbackError handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-callbackError`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":"NotAnErrorType!\$callbackError"/);
    });

    it('gets SFE log msg from wrapped fail handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-fail`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":"NotAnErrorType!\$failError"/);
    });

    it('gets SFE log msg from wrapped succeed handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-succeed`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      expect(JSON.stringify(logResult)).to.match(/"errorId":null/);
    });

    it('gets right duration value from wrapped callback handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-callback`,
      });
      const logResult = resolveAndValidateLog(LogResult);
      const duration = parseFloat(JSON.stringify(logResult).match(/"duration":(\d+\.\d+)/)[1]);
      expect(duration).to.be.above(5);
    });

    it('gets the callback return value when a promise func calls callback', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-promise-and-callback-race`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('callbackEarlyReturn');
    });

    it('gets spans', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-spans`,
      });
      const payload = resolveAndValidateLog(LogResult);
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

    it('gets spans in node 10', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-spans10`,
      });
      const payload = resolveAndValidateLog(LogResult);
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
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-timeout`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('report');
    });

    it('gets SFE log msg from wrapped node timeout handler with callbackWaitsForEmptyEventLoop true', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-waitForEmptyLoop`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('report');
    });

    it('gets the current transaction id in wrapped node handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-getTransactionId`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
    });

    it('gets dashboard url for current transaction in wrapped node handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-getDashboardUrl`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
    });

    it('gets the return value when calling python', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonSuccess`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('success');
    });

    it('gets SFE log msg from wrapped python handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonSuccess`,
      });
      const payload = resolveAndValidateLog(LogResult);
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
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonHttpError`,
      });
      const payload = resolveAndValidateLog(LogResult);
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

    it('gets the return value when calling python2', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonSuccess2`,
      });
      resolveLog(LogResult); // Expose debug logs
      expect(JSON.parse(Payload)).to.equal('success');
    });

    it('gets SFE log msg from wrapped python2 handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonSuccess2`,
      });
      const payload = resolveAndValidateLog(LogResult);
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

    it('gets the error value when calling python error', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonError`,
      });
      resolveLog(LogResult); // Expose debug logs
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
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonError`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('error');
    });

    it('gets node eventTags', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-eventTags`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
      expect(payload.payload.eventTags.length).to.equal(1);
      expect(payload.payload.eventTags[0]).to.deep.equal({
        tagName: 'event-tagged',
        tagValue: 'true',
        custom: '{"customerId":5,"userName":"aaron.stuyvenberg"}',
      });
    });

    it('gets python eventTags', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonEventTags`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
      expect(payload.payload.eventTags.length).to.equal(1);
      expect(payload.payload.eventTags[0]).to.deep.equal({
        tagName: 'event-tagged',
        tagValue: 'true',
        custom: '{"customerId": 5, "userName": "aaron.stuyvenberg"}',
      });
    });

    it('sets node endpoint', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-setEndpoint`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
      expect(payload.payload.tags.endpoint).to.equal('/test/:param1');
      expect(payload.payload.tags.endpointMechanism).to.equal('explicit');
    });

    it('sets node endpoint along with http metadata', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-setEndpointWithHttpMetadata`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
      expect(payload.payload.tags.endpoint).to.equal('/test/:param2');
      expect(payload.payload.tags.httpMethod).to.equal('POST');
      expect(payload.payload.tags.httpStatusCode).to.equal('201');
      expect(payload.payload.tags.endpointMechanism).to.equal('explicit');
    });

    it('sets python endpoint', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonSetEndpoint`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
      expect(payload.payload.tags.endpoint).to.equal('/test/:param');
      expect(payload.payload.tags.httpMethod).to.equal('PATCH');
      expect(payload.payload.tags.httpStatusCode).to.equal('202');
      expect(payload.payload.tags.endpointMechanism).to.equal('explicit');
    });

    it('gets SFE log msg from wrapped python timeout handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonTimeout`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('report');
    });

    it('supports handler nested in a python submodule', async () => {
      const { Payload, LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonSubModule`,
      });
      const result = resolveAndValidateLog(LogResult);
      expect(result.type).to.equal('transaction');
      expect(JSON.parse(Payload)).to.equal('success');
    });

    it('gets the current transaction id in wrapped python handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonTransactionId`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
    });

    it('gets dashboard url for current transaction in wrapped python handler', async () => {
      const { LogResult } = await awsRequest(lambdaService, 'invoke', {
        LogType: 'Tail',
        FunctionName: `${serviceName}-dev-pythonDashboardUrl`,
      });
      const payload = resolveAndValidateLog(LogResult);
      expect(payload.type).to.equal('transaction');
    });
  });
};

describe('integration: wrapper', function () {
  this.timeout(1000 * 60 * 5);

  setupTests('regular');
  setupTests('dev', { SLS_DEV_MODE: '1' });
});
