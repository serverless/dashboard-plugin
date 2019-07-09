'use strict';

const type = 'aws.kinesis'

module.exports = function eventType(event = {}) {
  const { Records = [] } = event
  const [firstEvent = {}] = Records
  const { eventSource } = firstEvent
  // test is for firstEvent.eventVersion === '1.0'
  return eventSource === 'aws:kinesis' ? type : false
}
