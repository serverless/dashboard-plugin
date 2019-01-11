const asyncEvents = new Set([
  's3',
  'sns',
  'alexaSkill',
  'iot',
  'cloudwatchEvent',
  'cloudwatchLog',
  'cognitoUserPool',
  'alexaSmartHome'
])
module.exports = function dlqPolicy(policy, service) {
  const { functions } = service.declaration

  if (!functions) {
    return policy.approve()
  }

  for (const [name, { events, onError }] of Object.entries(functions)) {
    const eventTypes = new Set(events.map((ev) => Object.keys(ev)[0]))
    const eventIntersection = new Set([...asyncEvents].filter((x) => eventTypes.has(x)))
    if (events.length === 0 || eventIntersection.size > 0) {
      if (!onError) {
        throw new policy.Failure(`Function "${name}" doesn't have a Dead Letter Queue configured.`)
      }
    }
  }

  policy.approve()
}
