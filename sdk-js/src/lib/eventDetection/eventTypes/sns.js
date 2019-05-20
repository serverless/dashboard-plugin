const type = 'sns'

module.exports = function eventType(event = {}) {
  const { Records = [] } = event
  const [firstEvent = {}] = Records
  const { EventVersion, EventSource } = firstEvent
  return EventVersion === '1.0' && EventSource === 'aws:sns' ? type : false
}
