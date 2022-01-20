'use strict';

const type = 'aws.cloudwatch.log';

module.exports = function eventType(event = {}) {
  return event.awslogs && event.awslogs.data ? type : false;
};
