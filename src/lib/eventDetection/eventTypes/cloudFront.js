const type = 'cloudFront'

function eventType(event = {}) {
  const { Records = [] } = event
  return Records[0] && Records[0].cf ? type : false
}

export { eventType }
