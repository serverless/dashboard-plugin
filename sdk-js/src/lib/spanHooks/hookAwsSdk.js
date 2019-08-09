'use strict';

const requireHook = require('require-in-the-middle');
const { captureAwsRequestSpan } = require('../parsers');

module.exports = emitter => {
  requireHook(['aws-sdk'], awsSdk => {
    for (const Service of Object.values(awsSdk)) {
      if (Service.serviceIdentifier) {
        Service.prototype.customizeRequests(req => {
          req.on('complete', res => emitter.emit('span', captureAwsRequestSpan(res)));
          return req;
        });
      }
    }
    return awsSdk;
  });
};
