'use strict';

const type = 'aws.dynamodb';

module.exports = function eventType(event = {}) {
  const { Records = [] } = event;
  const [firstEvent = {}] = Records;
  const { eventSource } = firstEvent;

  return eventSource === 'aws:dynamodb' ? type : false;
};
