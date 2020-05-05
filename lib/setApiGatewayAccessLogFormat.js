'use strict';

const { API_GATEWAY_LOG_FORMAT, API_GATEWAY_V2_LOG_FORMAT } = require('./utils.js');

module.exports = ctx => {
  const serviceConfig = ctx.sls.service;
  if (
    serviceConfig.custom &&
    serviceConfig.custom.enterprise &&
    serviceConfig.custom.enterprise.collectApiGatewayLogs === false
  ) {
    return;
  }

  if (!serviceConfig.provider.logs) {
    serviceConfig.provider.logs = {};
  }
  if (
    !serviceConfig.provider.logs.restApi ||
    typeof serviceConfig.provider.logs.restApi !== 'object'
  ) {
    serviceConfig.provider.logs.restApi = {};
  }
  serviceConfig.provider.logs.restApi.format = JSON.stringify(API_GATEWAY_LOG_FORMAT);

  if (
    !serviceConfig.provider.logs.httpApi ||
    typeof serviceConfig.provider.logs.httpApi !== 'object'
  ) {
    serviceConfig.provider.logs.httpApi = {};
  }
  serviceConfig.provider.logs.httpApi.format = JSON.stringify(API_GATEWAY_V2_LOG_FORMAT);
};
