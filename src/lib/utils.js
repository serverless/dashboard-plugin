function upperFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function pickResourceType(template, resourcesType) {
  const resources = []
  for (const key in template.Resources) {
    const resource = template.Resources[key]
    if (resource.Type === resourcesType) {
      resources.push({
        key,
        resource
      })
    }
  }
  return resources
}

const API_GATEWAY_FILTER_PATTERN = JSON.stringify({
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
  errorMessage: '$context.error.message',
  requestTime: '$context.requestTime',
  format: 'sls-access-log',
  version: '1.0.0'
})
const LAMBDA_FILTER_PATTERN = '?"REPORT RequestId: " ?"SERVERLESS_ENTERPRISE"'

export { upperFirst, pickResourceType, API_GATEWAY_FILTER_PATTERN, LAMBDA_FILTER_PATTERN }
