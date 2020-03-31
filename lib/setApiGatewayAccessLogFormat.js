'use strict';

const { API_GATEWAY_LOG_FORMAT, API_GATEWAY_V2_LOG_FORMAT } = require('./utils.js');

module.exports = ctx => {
  if (
    ctx.sls.service.custom &&
    ctx.sls.service.custom.enterprise &&
    ctx.sls.service.custom.enterprise.collectApiGatewayLogs === false
  ) {
    return;
  }

  if (!ctx.sls.service.provider.logs) {
    ctx.sls.service.provider.logs = {};
  }
  if (
    !ctx.sls.service.provider.logs.restApi ||
    typeof ctx.sls.service.provider.logs.restApi !== 'object'
  ) {
    ctx.sls.service.provider.logs.restApi = {};
  }
  ctx.sls.service.provider.logs.restApi.format = JSON.stringify(API_GATEWAY_LOG_FORMAT);

  if (
    !ctx.sls.service.provider.logs.httpApi ||
    typeof ctx.sls.service.provider.logs.httpApi !== 'object'
  ) {
    ctx.sls.service.provider.logs.httpApi = {};
  }
  ctx.sls.service.provider.logs.httpApi.format = JSON.stringify(API_GATEWAY_V2_LOG_FORMAT);
};
