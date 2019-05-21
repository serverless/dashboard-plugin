const type = 'aws.s3'

module.exports = function eventType(event = {}) {
  const { Records = [] } = event
  const [firstEvent = {}] = Records
  const { eventVersion, eventSource } = firstEvent
  return ['2.0', '2.1'].indexOf(eventVersion) !== -1 && eventSource === 'aws:s3' ? type : false
}
