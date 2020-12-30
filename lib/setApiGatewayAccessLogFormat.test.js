'use strict';

const { expect } = require('chai');
const setApiGatewayAccessLogFormat = require('./setApiGatewayAccessLogFormat');
const { API_GATEWAY_LOG_FORMAT, API_GATEWAY_V2_LOG_FORMAT } = require('./utils');

describe('setApiGatewayAccessLogFormat', () => {
  let ctx;
  const expectedRestApiLogsConfig = { format: JSON.stringify(API_GATEWAY_LOG_FORMAT) };
  const expectedHttpApiLogsConfig = { format: JSON.stringify(API_GATEWAY_V2_LOG_FORMAT) };

  beforeEach(() => {
    ctx = {
      sls: {
        service: {
          provider: {},
          functions: {
            http: { events: [{ http: {} }] },
            httpApi: { events: [{ httpApi: {} }] },
          },
        },
      },
    };
  });
  it('does not touch the ctx if APIGW log collection is off', async () => {
    ctx.sls.service.custom = { enterprise: { collectApiGatewayLogs: false } };
    const oldCtx = JSON.parse(JSON.stringify(ctx));
    setApiGatewayAccessLogFormat(ctx);
    expect(oldCtx).to.deep.equal(ctx);
  });

  it('sets the log format if no logs are configured', async () => {
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal(expectedRestApiLogsConfig);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
  });

  it('sets the log format if no restApi logs are configured', async () => {
    ctx.sls.service.provider = { logs: {} };
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal(expectedRestApiLogsConfig);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
  });

  it('sets the log format if rest/http-api logs are set to default format', async () => {
    ctx.sls.service.provider = { logs: { restApi: true, httpApi: true } };
    setApiGatewayAccessLogFormat(ctx);
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal(expectedRestApiLogsConfig);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
  });

  it('Do not set the log format if rest/http-api logs are set with a different format', async () => {
    ctx.sls.service.provider = { logs: { restApi: { format: 'myformat' } } };
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal({ format: 'myformat' });
  });

  it('Do not set the Rest API log format if there are no Rest API events configured', async () => {
    delete ctx.sls.service.functions.http;
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
    expect(ctx.sls.service.provider.logs.restApi).to.equal(undefined);
  });

  it('Do not set the HTTP API log format if there are no HTTP API events configured', async () => {
    delete ctx.sls.service.functions.httpApi;
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.httpApi).to.equal(undefined);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal(expectedRestApiLogsConfig);
  });

  it('Do not set the Rest API log format if external Rest API is referenced', async () => {
    ctx.sls.service.provider.apiGateway = { restApiId: 'foo' };
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
    expect(ctx.sls.service.provider.logs.restApi).to.equal(undefined);
  });

  it('Do not set the HTTP API log format if external HTTP API is referenced', async () => {
    ctx.sls.service.provider.httpApi = { id: 'foo' };
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.httpApi).to.equal(undefined);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal(expectedRestApiLogsConfig);
  });
});
