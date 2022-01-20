'use strict';

const type = 'aws.cloudwatch.event';

module.exports = function eventType(event = {}) {
  return event.source && event.detail ? type : false;
};
