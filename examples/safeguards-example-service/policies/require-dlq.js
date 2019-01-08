module.exports = function dlqPolicy(policy, service) {
  const { functions } = service.compiled['serverless-state.json'].service

  if (!functions) {
    return policy.approve()
  }

  for (const [name, { events }] of Object.entries(functions)) {
    if (!events) {
      continue
    }

    for (const { onError } of events) {
      if (!onError) {
        throw new policy.Failure(`Function "${name}" doesn't have a Dead Letter Queue configurd.`)
      }
    }
  }

  policy.approve()
}
