import logFromKeys from '../util/logFromKeys';

const type = 'kinesis';

function eventType(event = {}) {
  const { Records = [] } = event;
  const [firstEvent = {}] = Records;
  const { eventVersion, eventSource } = firstEvent;
  return eventVersion === '1.0' && eventSource === 'aws:kinesis' ? type : false;
}

const keys = [
  'Records[0].awsRegion',
  'Records[0].eventSourceARN',
  'Records.length'
];

function plugin(event, log) {
  logFromKeys({
    type,
    event,
    keys,
    log
  });
}

export { eventType, plugin };
