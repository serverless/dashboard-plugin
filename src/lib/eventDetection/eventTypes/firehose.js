const type = 'firehose'

export default function eventType(event = {}) {
  const { records = [] } = event
  return event.deliveryStreamArn && records[0] && records[0].kinesisRecordMetadata ? type : false
}
