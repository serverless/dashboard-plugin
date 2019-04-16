import { getSecret, getAccessKeyForTenant } from '@serverless/platform-sdk'
import _ from 'lodash'

export const getSecretFromEnterprise = async ({ secretName, tenant, app, service }) => {
  const accessKey = await getAccessKeyForTenant(tenant)
  const { secretValue } = await getSecret({ secretName, tenant, app, service, accessKey })
  return secretValue
}

export const hookIntoVariableGetter = (ctx) => {
  const { getValueFromSource } = ctx.sls.variables

  ctx.sls.variables.getValueFromSource = (variableString) => {
    if (variableString.startsWith(`secrets:`)) {
      ctx.state.secretsUsed.add(variableString.substring(8))
      if (ctx.sls.processedInput.commands[0] === 'login') {
        return {}
      }
      return getSecretFromEnterprise({
        secretName: variableString.split(`secrets:`)[1],
        ..._.pick(ctx.sls.service, ['tenant', 'app', 'service'])
      })
    }

    const value = getValueFromSource.bind(ctx.sls.variables)(variableString)
    return value
  }

  // return a restore function (mostly for testing)
  return () => {
    ctx.sls.variables.getValueFromSource = getValueFromSource
  }
}
