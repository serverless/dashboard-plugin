export const hookIntoVariableGetter = (ctx, secrets) => {
  const { getValueFromSource } = ctx.sls.variables

  ctx.sls.variables.getValueFromSource = (variableString) => {
    if (variableString.startsWith(`secrets:`)) {
      ctx.state.secretsUsed.add(variableString.substring(8))
      if (ctx.sls.processedInput.commands[0] === 'login') {
        return {}
      }
      if (!secrets[variableString.split(`secrets:`)[1]]) {
        throw new Error(`$\{${variableString}} not defined`)
      }
      return secrets[variableString.split(`secrets:`)[1]]
    }

    const value = getValueFromSource.bind(ctx.sls.variables)(variableString)
    return value
  }

  // return a restore function (mostly for testing)
  return () => {
    ctx.sls.variables.getValueFromSource = getValueFromSource
  }
}
