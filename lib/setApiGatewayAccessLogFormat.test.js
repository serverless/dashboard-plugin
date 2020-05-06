'use strict';

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

  it('sets the log format if rest/http-api logs are set with a different format', async () => {
    ctx.sls.service.provider = { logs: { restApi: { format: 'myformat' } } };
    setApiGatewayAccessLogFormat(ctx);
    setApiGatewayAccessLogFormat(ctx);
    expect(ctx.sls.service.provider.logs.restApi).to.deep.equal(expectedRestApiLogsConfig);
    expect(ctx.sls.service.provider.logs.httpApi).to.deep.equal(expectedHttpApiLogsConfig);
  });
});
