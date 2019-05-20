import logFromKeys from '../util/logFromKeys';

const type = 'apiGateway';

function eventType(event) {
  const apiGatewayRequiredKeys = [
    'path',
    'headers',
    'requestContext',
    'resource',
    'httpMethod'
  ];
  if (typeof event === 'object') {
    return apiGatewayRequiredKeys.every(s => s in event) ? type : false;
  }
  return false;
}

const keys = [
  'httpMethod',
  'path',
  'requestContext.accountId',
  'requestContext.httpMethod',
  'requestContext.identity.userAgent',
  'requestContext.requestId',
  'requestContext.resourcePath',
  'requestContext.stage',
  'resource'
];

function plugin(event, log) {
  logFromKeys({ event, type, keys, log });
}

export { eventType, plugin };
