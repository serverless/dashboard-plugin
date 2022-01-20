'use strict';

const type = 'aws.apigatewayv2.http';

module.exports = function eventType(event) {
  const apiGatewayV2RequiredKeys = ['rawPath', 'headers', 'requestContext', 'routeKey', 'version'];
  if (typeof event === 'object') {
    return apiGatewayV2RequiredKeys.every((key) => key in event) && event.version === '2.0'
      ? type
      : false;
  }
  return false;
};
