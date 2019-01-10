module.exports = function dlqPolicy(policy, service) {
  const { functions } = service.compiled['serverless-state.json'].service

  if (!functions) {
    return policy.approve()
  }

  for (const [name, { events /*, onError*/ }] of Object.entries(functions)) {
    /*
    if (events && 'http' in events) {
      continue
    }
    */

    if (!onError) {
      throw new policy.Failure(`Function "${name}" doesn't have a Dead Letter Queue configured.`)
    }
  }

  policy.approve()
}
