const type = 'scheduled'

function eventType(event = {}) {
  return event.source === 'aws.events' ? type : false
}

export { eventType }
