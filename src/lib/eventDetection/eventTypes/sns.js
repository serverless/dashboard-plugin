import logFromKeys from '../util/logFromKeys';

const type = 'sns';

function eventType(event = {}) {
  const { Records = [] } = event;
  const [firstEvent = {}] = Records;
  const { EventVersion, EventSource } = firstEvent;
  return EventVersion === '1.0' && EventSource === 'aws:sns' ? type : false;
}

const keys = [
  'EventSubscriptionArn',
  'Sns.MessageId',
  'Sns.Signature',
  'Sns.Type',
  'Sns.TopicArn',
  'Sns.SignatureVersion',
  'Sns.Timestamp',
  'Sns.SigningCertUrl',
  'Sns.UnsubscribeUrl',
  'Sns.Subject'
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
