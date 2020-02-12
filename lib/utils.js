'use strict';

function upperFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pickResourceType(template, resourcesType) {
  const resources = [];
  for (const key of Object.keys(template.Resources)) {
    const resource = template.Resources[key];
    if (resource.Type === resourcesType) {
      resources.push({
        key,
        resource,
      });
    }
  }
  return resources;
}

const API_GATEWAY_FILTER_PATTERN = '"SLS_ACCESS_LOG"';
const LAMBDA_FILTER_PATTERN = '?"REPORT RequestId: " ?"SERVERLESS_ENTERPRISE"';
const API_GATEWAY_LOG_FORMAT = {
  requestTime: '$context.requestTime',
  requestId: '$context.requestId',
  apiId: '$context.apiId',
  resourceId: '$context.resourceId',
  resourcePath: '$context.resourcePath',
  path: '$context.path',
  httpMethod: '$context.httpMethod',
  status: '$context.status',
  authLatency: '$context.authorizer.integrationLatency',
  integrationLatency: '$context.integrationLatency',
  integrationStatus: '$context.integrationStatus',
  responseLatency: '$context.responseLatency',
  responseLength: '$context.responseLength',
  // we have to escape the error message based on
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html#util-template-reference
  errorMessage: '$util.escapeJavaScript($context.error.message).replaceAll("\\\'","\'")',
  format: 'SLS_ACCESS_LOG',
  version: '1.0.0',
};

module.exports = {
  upperFirst,
  pickResourceType,
  API_GATEWAY_FILTER_PATTERN,
  LAMBDA_FILTER_PATTERN,
  API_GATEWAY_LOG_FORMAT,
};
