const type = 's3'

export default function eventType(event = {}) {
  const { Records = [] } = event
  const [firstEvent = {}] = Records
  const { eventVersion, eventSource } = firstEvent
  return ['2.0', '2.1'].indexOf(eventVersion) !== -1 && eventSource === 'aws:s3' ? type : false
}
