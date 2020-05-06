'use strict';

const _ = require('lodash');

const { API_GATEWAY_LOG_FORMAT, API_GATEWAY_V2_LOG_FORMAT } = require('./utils.js');

const setupHttpLogs = serviceConfig => {
  let logsConfig = serviceConfig.provider.logs;
  if (logsConfig && logsConfig.restApi != null) {
    // Ensure to not override eventual specified logs configuration
    if (!logsConfig.restApi) return;
    if (logsConfig.restApi.format) return;
  }

  if (
    !_.values(serviceConfig.functions).some(functionData =>
      functionData.events.some(event => event.http)
    )
  ) {
    // Do not proceed if there are no `http` events
    return;
  }

  if (!logsConfig) logsConfig = serviceConfig.provider.logs = {};
  if (!_.isObject(logsConfig.restApi)) logsConfig.restApi = {};
  logsConfig.restApi.format = JSON.stringify(API_GATEWAY_LOG_FORMAT);
};

const setupHttpApiLogs = serviceConfig => {
  let logsConfig = serviceConfig.provider.logs;
  if (logsConfig && logsConfig.httpApi != null) {
    // Ensure to not override eventual specified logs configuration
    if (!logsConfig.httpApi) return;
    if (logsConfig.httpApi.format) return;
  }

  if (
    !_.values(serviceConfig.functions).some(functionData =>
      functionData.events.some(event => event.httpApi)
    )
  ) {
    // Do not proceed if there are no `httpApi` events
    return;
  }

  if (!logsConfig) logsConfig = serviceConfig.provider.logs = {};
  if (!_.isObject(logsConfig.httpApi)) logsConfig.httpApi = {};
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
