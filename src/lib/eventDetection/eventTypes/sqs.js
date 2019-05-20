const type = 'sqs'

function eventType(event = {}) {
  const { Records = [] } = event
  const [firstEvent = {}] = Records
  const { eventSource } = firstEvent
  return eventSource === 'aws:sqs' ? type : false
}

export { eventType }
