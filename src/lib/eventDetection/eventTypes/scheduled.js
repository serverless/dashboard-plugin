import logFromKeys from '../util/logFromKeys';

const type = 'scheduled';

function eventType(event = {}) {
  return event.source === 'aws.events' ? type : false;
}

const keys = ['region', 'account', 'time', 'id', 'resources[0]'];

function plugin(event, log) {
  logFromKeys({
    type,
    event,
    keys,
    log
  });
}

export { eventType, plugin };
