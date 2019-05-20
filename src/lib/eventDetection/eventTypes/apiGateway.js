const type = 'apiGateway'

export default function eventType(event) {
  const apiGatewayRequiredKeys = ['path', 'headers', 'requestContext', 'resource', 'httpMethod']
  if (typeof event === 'object') {
    return apiGatewayRequiredKeys.every((key) => key in event) ? type : false
  }
  return false
}
