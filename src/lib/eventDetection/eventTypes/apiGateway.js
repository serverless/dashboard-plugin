const type = 'apiGateway'

function eventType(event) {
  const apiGatewayRequiredKeys = ['path', 'headers', 'requestContext', 'resource', 'httpMethod']
  if (typeof event === 'object') {
    return apiGatewayRequiredKeys.every((s) => s in event) ? type : false
  }
  return false
}
export { eventType }
