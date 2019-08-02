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

jest.setTimeout(1000 * 60 * 5);

beforeAll(async () => {
  const accessKey = await getAccessKeyForTenant('integration');
  const {
    providerCredentials: { secretValue: credentials },
  } = await getDeployProfile({
    tenant: 'integration',
    app: 'integration',
    stage: 'dev',
    service: serviceName,
    accessKey,
  });

  lambda = new AWS.Lambda({ region: 'us-east-1', credentials });
  ({ sls, teardown } = await setup('service3'));
  await sls(['deploy']);
  serviceName = stripAnsi(
    String((await sls(['print', '--path', 'service'], { env: { SLS_DEBUG: '' } })).stdoutBuffer)
  ).trim();
});

afterAll(() => {
  if (teardown) return teardown();
  return null;
});

describe('integration', () => {
  it('gets right return value from  wrapped sync handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-sync` }).promise();
    expect(JSON.parse(Payload)).toEqual(null); // why did i think this was possible?
  });

  it('gets right return value from  wrapped syncError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-syncError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('syncError');
  });

  it('gets right return value from  wrapped async handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-async` }).promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('gets right return value from  wrapped asyncError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-asyncError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('asyncError');
  });

  it('gets right return value from  wrapped asyncDanglingCallback handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-asyncDanglingCallback` })
      .promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('gets right return value from  wrapped done handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-done` }).promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('gets right return value from  wrapped doneError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-doneError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('doneError');
  });

  it('gets right return value from  wrapped callback handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-callback` })
      .promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('gets right return value from  wrapped callbackError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-callbackError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('callbackError');
  });

  it('gets right return value from  wrapped fail handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-fail` }).promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('failError');
  });

  it('gets right return value from  wrapped succeed handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-succeed` })
      .promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('gets SFE log msg from wrapped sync handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-sync` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped syncError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-syncError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"Error!\$syncError"/);
  });

  it('gets SFE log msg from wrapped async handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-async` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped asyncError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-asyncError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"Error!\$asyncError"/);
  });

  it('gets SFE log msg from wrapped asyncDanglingCallback handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-asyncDanglingCallback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped done handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-done` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped doneError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-doneError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"NotAnErrorType!\$doneError"/);
  });

  it('gets SFE log msg from wrapped callback handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
  });

  it('gets SFE log msg from wrapped callbackError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callbackError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"NotAnErrorType!\$callbackError"/);
  });

  it('gets SFE log msg from wrapped fail handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-fail` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"NotAnErrorType!\$failError"/);
  });

  it('gets SFE log msg from wrapped succeed handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-succeed` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
  });

  it('gets right duration value from  wrapped callback handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    const duration = logResult.parseFloat('"duration":13.242'.match(/"duration":(\d+\.\d+)/)[1]);
    expect(duration).toBeGreatherThan(5);
  });
});
