import { getSecret, getAccessKeyForTenant } from '@serverless/platform-sdk'
import _ from 'lodash'

export const getSecretFromEnterprise = async ({ secretName, tenant, app, service }) => {
  const accessKey = await getAccessKeyForTenant(tenant)
  const { secretValue } = await getSecret({ secretName, tenant, app, service, accessKey })
  return secretValue
}

export const hookIntoVariableGetter = (ctx) => {
  const { getValueFromSource } = ctx.serverless.variables

  ctx.serverless.variables.getValueFromSource = (variableString) => {
    if (variableString.startsWith(`secrets:`)) {
      if (serverless.processedInput.commands[0] === 'login') {
        return {}
      }
      return getSecretFromEnterprise({
        secretName: variableString.split(`secrets:`)[1],
        ..._.pick(ctx.serverless.service, ['tenant', 'app', 'service'])
      })
    }

    const value = getValueFromSource.bind(ctx.serverless.variables)(variableString)
    ctx.state.secretsUsed.add(variableString)
    return value
  }

  // return a restore function (mostly for testing)
  return () => {
    ctx.serverless.variables.getValueFromSource = getValueFromSource
  }
}
