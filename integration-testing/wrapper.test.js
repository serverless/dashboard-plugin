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
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-sync` }).promise();
    expect(JSON.parse(Payload)).toEqual(null); // why did i think this was possible?
  });

  it('can call wrapped syncError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-syncError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('syncError');
  });

  it('can call wrapped async handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-async` }).promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped asyncError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-asyncError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('asyncError');
  });

  it('can call wrapped asyncDanglingCallback handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-asyncDanglingCallback` })
      .promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped done handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-done` }).promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped doneError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-doneError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('doneError');
  });

  it('can call wrapped callback handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-callback` })
      .promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });

  it('can call wrapped callbackError handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-callbackError` })
      .promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('callbackError');
  });

  it('can call wrapped fail handler', async () => {
    const { Payload } = await lambda.invoke({ FunctionName: `${serviceName}-dev-fail` }).promise();
    expect(JSON.parse(Payload).errorMessage).toEqual('failError');
  });

  it('can call wrapped succeed handler', async () => {
    const { Payload } = await lambda
      .invoke({ FunctionName: `${serviceName}-dev-succeed` })
      .promise();
    expect(JSON.parse(Payload)).toEqual({ statusCode: 200 });
  });
});
