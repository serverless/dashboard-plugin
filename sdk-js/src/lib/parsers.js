'use strict';

const util = require('util');

exports._MAX_HTTP_BODY_CHARS = 2048; // expose for testing purposes

exports.parseMessage = function (msg) {
  const error = { log: {} };

  if (typeof msg === 'string') {
    error.log.message = msg;
  } else if (typeof msg === 'object' && msg !== null) {
    // if `captureError` is passed an object instead of an error or a string we
    // expect it to be in the format of `{ message: '...', params: [] }` and it
    // will be used as `param_message`.
    if (msg.message) {
      error.log.message = util.format.apply(this, [msg.message].concat(msg.params));
      error.log.param_message = msg.message;
    } else {
      error.log.message = util.inspect(msg);
    }
  } else {
    error.log.message = String(msg);
  }

  return error;
};

module.exports.captureAwsRequestSpan = function (resp) {
  const endTime = new Date();

  const awsRegion = resp.request.httpRequest.region || null;
  const hostname = resp.request.service.endpoint.host;
  const awsService = resp.request.service.serviceIdentifier;

  const spanDetails = {
    tags: {
      type: 'aws',
      requestHostname: hostname,
      aws: {
        region: awsRegion,
        service: awsService,
        operation: resp.request.operation,
        requestId: resp.requestId,
        errorCode: (resp.error && resp.error.code) || null,
      },
    },
    startTime: resp.request.startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: endTime.getTime() - resp.request.startTime.getTime(),
  };

  return spanDetails;
};
