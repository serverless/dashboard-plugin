'use strict';

const { API_GATEWAY_LOG_FORMAT, API_GATEWAY_V2_LOG_FORMAT } = require('./utils.js');

const setupHttpLogs = serviceConfig => {
  if (!serviceConfig.provider.logs) serviceConfig.provider.logs = {};

  const logsConfig = serviceConfig.provider.logs;
  if (!logsConfig.restApi || typeof logsConfig.restApi !== 'object') {
    logsConfig.restApi = {};
  }
  logsConfig.restApi.format = JSON.stringify(API_GATEWAY_LOG_FORMAT);
};

const setupHttpApiLogs = serviceConfig => {
  if (!serviceConfig.provider.logs) serviceConfig.provider.logs = {};

  const logsConfig = serviceConfig.provider.logs;
  if (!logsConfig.httpApi || typeof logsConfig.httpApi !== 'object') {
    logsConfig.httpApi = {};
  }
  logsConfig.httpApi.format = JSON.stringify(API_GATEWAY_V2_LOG_FORMAT);
};

module.exports = ctx => {
  const serviceConfig = ctx.sls.service;
  if (
    serviceConfig.custom &&
    serviceConfig.custom.enterprise &&
    serviceConfig.custom.enterprise.collectApiGatewayLogs === false
  ) {
    return;
  }

  setupHttpLogs(serviceConfig);
  setupHttpApiLogs(serviceConfig);
};
