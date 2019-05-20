const type = 'scheduled'

export default function eventType(event = {}) {
  return event.source === 'aws.events' ? type : false
}
