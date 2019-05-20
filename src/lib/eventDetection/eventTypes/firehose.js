import logFromKeys from '../util/logFromKeys';

const type = 'firehose';

function eventType(event = {}) {
  const { records = [] } = event;
  return event.deliveryStreamArn &&
    records[0] &&
    records[0].kinesisRecordMetadata
    ? type
    : false;
}

const keys = ['records.length', 'deliveryStreamArn', 'region'];

function plugin(event, log) {
  logFromKeys({
    type,
    event,
    keys,
    log
  });
}

export { eventType, plugin };
