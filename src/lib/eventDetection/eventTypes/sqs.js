import logFromKeys from '../util/logFromKeys';

const type = 'sqs';

function eventType(event = {}) {
  const { Records = [] } = event;
  const [firstEvent = {}] = Records;
  const { eventSource } = firstEvent;
  return eventSource === 'aws:sqs' ? type : false;
}

const keys = [
  'receiptHandle',
  'md5OfBody',
  'eventSourceARN',
  'awsRegion',
  'messageId',
  'attributes.ApproximateFirstReceiveTimestamp',
  'attributes.SenderId',
  'attributes.ApproximateReceiveCount',
  'attributes.SentTimestamp'
].map(str => `Records[0].${str}`);

function plugin(event, log) {
  logFromKeys({
    type,
    event,
    keys,
    log
  });
}

export { eventType, plugin };
