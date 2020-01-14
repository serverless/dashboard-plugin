'use strict';

process.env.SERVERLESS_PLATFORM_STAGE = 'dev';

const setup = require('./setup');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const awsRequest = require('@serverless/test/aws-request');

let sls;
let teardown;
let serviceName;
const org = process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration';
const app = process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration';

const resolveLog = encodedLogMsg => {
  const logMsg = new Buffer(encodedLogMsg, 'base64').toString();
  expect(logMsg).to.match(/SERVERLESS_ENTERPRISE/);
  const logLine = logMsg.split('\n').find(line => line.includes('SERVERLESS_ENTERPRISE'));
  const payloadString = logLine.split('SERVERLESS_ENTERPRISE')[1].split('END RequestId')[0];
  return JSON.parse(payloadString);
};

describe('integration: wrapper', function() {
  this.timeout(1000 * 60 * 5);
  let lambdaService;

  beforeAll(async () => {
    const accessKey = await getAccessKeyForTenant(org);
    lambdaService = {
      name: 'Lambda',
      params: {
        credentials: (
          await getDeployProfile({
            tenant: org,
            app,
            stage: 'dev',
            service: serviceName,
            accessKey,
          })
        ).providerCredentials.secretValue,
      },
    };

    ({ sls, teardown, serviceName } = await setup('wrapper-service'));
    await sls(['deploy']);
  });

  afterAll(() => {
    if (teardown) return teardown();
    return null;
  });

  it('gets right return value from  wrapped sync handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-sync`,
    });
    expect(JSON.parse(Payload)).to.equal(null); // why did i think this was possible?
  });

  it('gets right return value from  wrapped syncError handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-syncError`,
    });
    expect(JSON.parse(Payload).errorMessage).to.equal('syncError');
  });

  it('gets right return value from  wrapped async handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-async`,
    });
    expect(JSON.parse(Payload)).to.equal('asyncReturn');
  });

  it('gets right return value from  wrapped asyncError handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-asyncError`,
    });
    expect(JSON.parse(Payload).errorMessage).to.equal('asyncError');
  });

  it('gets right return value from  wrapped asyncDanglingCallback handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-asyncDanglingCallback`,
    });
    expect(JSON.parse(Payload)).to.equal('asyncDanglyReturn');
  });

  it('gets right return value from  wrapped done handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-done`,
    });
    expect(JSON.parse(Payload)).to.equal('doneReturn');
  });

  it('gets right return value from  wrapped doneError handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-doneError`,
    });
    expect(JSON.parse(Payload).errorMessage).to.equal('doneError');
  });

  it('gets right return value from  wrapped callback handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-callback`,
    });
    expect(JSON.parse(Payload)).to.equal('callbackReturn');
  });

  it('gets right return value from  wrapped callback handler with dangling events but callbackWaitsForEmptyEventLoop=false', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-noWaitForEmptyLoop`,
    });
    expect(JSON.parse(Payload)).to.equal('noWaitForEmptyLoop');
  });

  it('gets right return value from  wrapped callbackError handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-callbackError`,
    });
    expect(JSON.parse(Payload).errorMessage).to.equal('callbackError');
  });

  it('gets right return value from  wrapped fail handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-fail`,
    });
    expect(JSON.parse(Payload).errorMessage).to.equal('failError');
  });

  it('gets right return value from  wrapped succeed handler', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-succeed`,
    });
    expect(JSON.parse(Payload)).to.equal('succeedReturn');
  });

  xit('gets SFE log msg from wrapped sync handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-sync`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped syncError handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-syncError`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"Error!\$syncError"/);
  });

  it('gets SFE log msg from wrapped async handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-async`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped asyncError handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-asyncError`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"Error!\$asyncError"/);
  });

  it('gets SFE log msg from wrapped asyncDanglingCallback handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-asyncDanglingCallback`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped done handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-done`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped doneError handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-doneError`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"NotAnErrorType!\$doneError"/);
  });

  it('gets SFE log msg from wrapped callback handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-callback`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped callbackError handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-callbackError`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"NotAnErrorType!\$callbackError"/);
  });

  it('gets SFE log msg from wrapped fail handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-fail`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"NotAnErrorType!\$failError"/);
  });

  it('gets SFE log msg from wrapped succeed handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-succeed`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets right duration value from  wrapped callback handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-callback`,
    });
    const logResult = new Buffer(LogResult, 'base64').toString();
    const duration = parseFloat(logResult.match(/"duration":(\d+\.\d+)/)[1]);
    expect(duration).to.be.above(5);
  });

  it('gets the callback return value when a promise func calls callback', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-promise-and-callback-race`,
    });
    expect(JSON.parse(Payload)).to.equal('callbackEarlyReturn');
  });

  it('gets spans', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-spans`,
    });
    const payload = resolveLog(LogResult);
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
      requestHostname: 'example.com',
      requestPath: '/',
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
    const payload = resolveLog(LogResult);
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
      requestHostname: 'example.com',
      requestPath: '/',
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
    const payload = resolveLog(LogResult);
    expect(payload.type).to.equal('report');
  });

  it('gets SFE log msg from wrapped node timeout handler with callbackWaitsForEmptyEventLoop true', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-waitForEmptyLoop`,
    });
    const payload = resolveLog(LogResult);
    expect(payload.type).to.equal('report');
  });

  it('gets the return value when calling python', async () => {
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-pythonSuccess`,
    });
    expect(JSON.parse(Payload)).to.equal('success');
  });

  it('gets SFE log msg from wrapped python handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-pythonSuccess`,
    });
    const payload = resolveLog(LogResult);
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
    const payload = resolveLog(LogResult);
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
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-pythonSuccess2`,
    });
    expect(JSON.parse(Payload)).to.equal('success');
  });

  it('gets SFE log msg from wrapped python2 handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-pythonSuccess2`,
    });
    const payload = resolveLog(LogResult);
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
    const { Payload } = await awsRequest(lambdaService, 'invoke', {
      FunctionName: `${serviceName}-dev-pythonError`,
    });
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
    const payload = resolveLog(LogResult);
    expect(payload.type).to.equal('error');
  });

  it('gets node eventTags', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-eventTags`,
    });
    const payload = resolveLog(LogResult);
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
    const payload = resolveLog(LogResult);
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.eventTags.length).to.equal(1);
    expect(payload.payload.eventTags[0]).to.deep.equal({
      tagName: 'event-tagged',
      tagValue: 'true',
      custom: '{"customerId": 5, "userName": "aaron.stuyvenberg"}',
    });
  });

  it('gets SFE log msg from wrapped python timeout handler', async () => {
    const { LogResult } = await awsRequest(lambdaService, 'invoke', {
      LogType: 'Tail',
      FunctionName: `${serviceName}-dev-pythonTimeout`,
    });
    const payload = resolveLog(LogResult);
    expect(payload.type).to.equal('report');
  });
});
