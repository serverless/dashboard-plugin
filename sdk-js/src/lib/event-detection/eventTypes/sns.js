'use strict';

const type = 'aws.sns';

module.exports = function eventType(event = {}) {
  const { Records = [] } = event;
  const [firstEvent = {}] = Records;
  const { EventSource } = firstEvent;
  // test is for firstEvent.EventVersion === '1.0'
  return EventSource === 'aws:sns' ? type : false;
};
