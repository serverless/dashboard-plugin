const type = 'scheduled'

module.exports = function eventType(event = {}) {
  return event.source === 'aws.events' ? type : false
}
