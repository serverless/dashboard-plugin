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

const API_GATEWAY_FILTER_PATTERN = '"SLS_ACCESS_LOG"'
const LAMBDA_FILTER_PATTERN = '?"REPORT RequestId: " ?"SERVERLESS_ENTERPRISE"'

export { upperFirst, pickResourceType, API_GATEWAY_FILTER_PATTERN, LAMBDA_FILTER_PATTERN }
