import logFromKeys from '../util/logFromKeys';

const type = 's3';

function eventType(event = {}) {
  const { Records = [] } = event;
  const [firstEvent = {}] = Records;
  const { eventVersion, eventSource } = firstEvent;
  return ['2.0', '2.1'].indexOf(eventVersion) !== -1 && eventSource === 'aws:s3'
    ? type
    : false;
}

const keys = [
  'responseElements["x-amz-request-id"]',
  'responseElements["x-amz-id-2"]',
  'awsRegion',
  's3.bucket.name',
  's3.bucket.arn',
  's3.object.key',
  's3.object.size',
  's3.object.sequencer',
  'eventTime',
  'eventName',
  'userIdentity.principalId',
  'requestParameters.sourceIPAddress'
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
