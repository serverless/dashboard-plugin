'use strict';
process.env.SERVERLESS_PLATFORM_STAGE = 'dev';

const stripAnsi = require('strip-ansi');
const setup = require('./setup');
const { getAccessKeyForTenant, getDeployProfile } = require('@serverless/platform-sdk');
const AWS = require('aws-sdk');

let lambda;
let sls;
let teardown;
let serviceName;

describe('integration: wrapper', function() {
  this.timeout(1000 * 60 * 5);

  beforeAll(async () => {
    const accessKey = await getAccessKeyForTenant('integration');
    const {
      providerCredentials: { secretValue: credentials },
    } = await getDeployProfile({
      org: 'integration',
      app: 'integration',
      stage: 'dev',
      service: serviceName,
      accessKey,
    });

    lambda = new AWS.Lambda({ region: 'us-east-1', credentials });
    ({ sls, teardown } = await setup('wrapper-service'));
    await sls(['deploy']);
    serviceName = stripAnsi(
      String((await sls(['print', '--path', 'service'], { env: { SLS_DEBUG: '' } })).stdoutBuffer)
    ).trim();
  });

  afterAll(() => {
    if (teardown) return teardown();
    return null;
  });

  it('gets right return value from  wrapped sync handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-sync` }).promise();
    expect(JSON.parse(Payload)).to.equal(null); // why did i think this was possible?
  });

  it('gets right return value from  wrapped syncError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-syncError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).to.equal('syncError');
  });

  it('gets right return value from  wrapped async handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-async` }).promise();
    expect(JSON.parse(Payload)).to.equal('asyncReturn');
  });

  it('gets right return value from  wrapped asyncError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-asyncError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).to.equal('asyncError');
  });

  it('gets right return value from  wrapped asyncDanglingCallback handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-asyncDanglingCallback` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('asyncDanglyReturn');
  });

  it('gets right return value from  wrapped done handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-done` }).promise();
    expect(JSON.parse(Payload)).to.equal('doneReturn');
  });

  it('gets right return value from  wrapped doneError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-doneError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).to.equal('doneError');
  });

  it('gets right return value from  wrapped callback handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-callback` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('callbackReturn');
  });

  it('gets right return value from  wrapped callback handler with dangling events but callbackWaitsForEmptyEventLoop=false', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-noWaitForEmptyLoop` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('noWaitForEmptyLoop');
  });

  it('gets right return value from  wrapped callbackError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-callbackError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).to.equal('callbackError');
  });

  it('gets right return value from  wrapped fail handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-fail` }).promise();
    expect(JSON.parse(Payload).errorMessage).to.equal('failError');
  });

  it('gets right return value from  wrapped succeed handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-succeed` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('succeedReturn');
  });

  xit('gets SFE log msg from wrapped sync handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-sync` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped syncError handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-syncError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"Error!\$syncError"/);
  });

  it('gets SFE log msg from wrapped async handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-async` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped asyncError handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-asyncError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"Error!\$asyncError"/);
  });

  it('gets SFE log msg from wrapped asyncDanglingCallback handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-asyncDanglingCallback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped done handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-done` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped doneError handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-doneError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"NotAnErrorType!\$doneError"/);
  });

  it('gets SFE log msg from wrapped callback handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped callbackError handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callbackError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"NotAnErrorType!\$callbackError"/);
  });

  it('gets SFE log msg from wrapped fail handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-fail` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":"NotAnErrorType!\$failError"/);
  });

  it('gets SFE log msg from wrapped succeed handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-succeed` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/"errorId":null/);
  });

  it('gets right duration value from  wrapped callback handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    const duration = parseFloat(logResult.match(/"duration":(\d+\.\d+)/)[1]);
    expect(duration).to.be.above(5);
  });

  it('gets the callback return value when a promise func calls callback', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-promise-and-callback-race` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('callbackEarlyReturn');
  });

  it('gets spans', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-spans` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
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

  it('gets spans in node 8', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-spans8` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
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
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-timeout` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
    expect(payload.type).to.equal('report');
  });

  it('gets SFE log msg from wrapped node timeout handler with callbackWaitsForEmptyEventLoop true', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-waitForEmptyLoop` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
    expect(payload.type).to.equal('report');
  });

  it('gets the return value when calling python', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-pythonSuccess` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('success');
  });

  it('gets SFE log msg from wrapped python handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-pythonSuccess` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.startsWith('SERVERLESS_ENTERPRISE'))[0]
        .slice(22)
    );
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
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-pythonHttpError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.startsWith('SERVERLESS_ENTERPRISE'))[0]
        .slice(22)
    );
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
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-pythonSuccess2` })
      .promise();
    expect(JSON.parse(Payload)).to.equal('success');
  });

  it('gets SFE log msg from wrapped python2 handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-pythonSuccess2` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.startsWith('SERVERLESS_ENTERPRISE'))[0]
        .slice(22)
    );
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
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-pythonError` })
      .promise();
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
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-pythonError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.startsWith('SERVERLESS_ENTERPRISE'))[0]
        .slice(22)
    );
    expect(payload.type).to.equal('error');
  });

  it('gets node eventTags', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-eventTags` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.eventTags.length).to.equal(1);
    expect(payload.payload.eventTags[0]).to.deep.equal({
      tagName: 'event-tagged',
      tagValue: 'true',
      custom: '{"customerId":5,"userName":"aaron.stuyvenberg"}',
    });
  });

  it('gets python eventTags', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-pythonEventTags` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
    expect(payload.type).to.equal('transaction');
    expect(payload.payload.eventTags.length).to.equal(1);
    expect(payload.payload.eventTags[0]).to.deep.equal({
      tagName: 'event-tagged',
      tagValue: 'true',
      custom: '{"customerId": 5, "userName": "aaron.stuyvenberg"}',
    });
  });

  it('gets SFE log msg from wrapped python timeout handler', async () => {
    const { LogResult } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-pythonTimeout` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).to.match(/SERVERLESS_ENTERPRISE/);
    const payload = JSON.parse(
      logResult
        .split('\n')
        .filter(line => line.includes('SERVERLESS_ENTERPRISE'))[0]
        .split('SERVERLESS_ENTERPRISE')[1]
    );
    expect(payload.type).to.equal('report');
  });
});
