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
  it('can call wrapped sync handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-sync` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
    expect(JSON.parse(Payload)).toEqual(null); // why did i think this was possible?
  });

  it('can call wrapped syncError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-syncError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"Error!\$syncError"/);
    expect(JSON.parse(Payload).errorMessage).toEqual('syncError');
  });

  it('can call wrapped async handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-async` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped asyncError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-asyncError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"Error!\$asyncError"/);
    expect(JSON.parse(Payload).errorMessage).toEqual('asyncError');
  });

  it('can call wrapped asyncDanglingCallback handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-asyncDanglingCallback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped done handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-done` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped doneError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-doneError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"NotAnErrorType!\$doneError"/);
    expect(JSON.parse(Payload).errorMessage).toEqual('doneError');
  });

  it('can call wrapped callback handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callback` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped callbackError handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-callbackError` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"NotAnErrorType!\$callbackError"/);
    expect(JSON.parse(Payload).errorMessage).toEqual('callbackError');
  });

  it('can call wrapped fail handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-fail` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":"NotAnErrorType!\$failError"/);
    expect(JSON.parse(Payload).errorMessage).toEqual('failError');
  });

  it('can call wrapped succeed handler', async () => {
    const { LogResult, Payload } = await lambda
      .invoke({ LogType: 'Tail', FunctionName: `${serviceName}-dev-succeed` })
      .promise();
    const logResult = new Buffer(LogResult, 'base64').toString();
    expect(logResult).toMatch(/"errorId":null/);
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });
});
