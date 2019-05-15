import _ from 'lodash'
import { getStateVariable } from '@serverless/platform-sdk'

export const hookIntoVariableGetter = (ctx, secrets, accessKey) => {
  const { getValueFromSource } = ctx.sls.variables

  ctx.sls.variables.getValueFromSource = async (variableString) => {
    if (variableString.startsWith(`secrets:`)) {
      ctx.state.secretsUsed.add(variableString.substring(8))
      if (ctx.sls.processedInput.commands[0] === 'login') {
        return {}
      }
      if (!secrets[variableString.split(`secrets:`)[1]]) {
        throw new Error(`$\{${variableString}} not defined`)
      }
      return secrets[variableString.split(`secrets:`)[1]]
    } else if (variableString.startsWith(`state:`)) {
      if (ctx.sls.processedInput.commands[0] === 'login') {
        return {}
      }
      const service = variableString.substring(6).split('.', 1)[0]
      const key = variableString.substring(6).substr(service.length)
      const outputName = key.split('.')[1]
      const subkey = key.substr(outputName.length + 2)
      const value = await getStateVariable({
        accessKey,
        outputName,
        service,
        app: ctx.sls.service.app,
        tenant: ctx.sls.service.tenant,
        stage: ctx.provider.getStage(),
        region: ctx.provider.getRegion()
      })
      if (subkey) {
        return _.get(value, subkey)
      }
      return value
    }

    const value = getValueFromSource.bind(ctx.sls.variables)(variableString)
    return value
  }

  // return a restore function (mostly for testing)
  return () => {
    ctx.sls.variables.getValueFromSource = getValueFromSource
  }
}
