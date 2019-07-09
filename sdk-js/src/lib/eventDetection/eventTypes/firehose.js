'use strict';

const type = 'aws.firehose'

module.exports = function eventType(event = {}) {
  const { records = [] } = event
  return event.deliveryStreamArn && records[0] && records[0].kinesisRecordMetadata ? type : false
}
