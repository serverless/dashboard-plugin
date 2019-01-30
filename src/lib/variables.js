import { getSecret, getAccessKeyForTenant } from '@serverless/platform-sdk'
import _ from 'lodash'

export const getSecretFromEnterprise = async ({ secretName, tenant, app, service }) => {
  const accessKey = await getAccessKeyForTenant(tenant)
  return getSecret({ secretName, tenant, app, service, accessKey })
}

export const hookIntoVariableGetter = (serverless) => {
  const { getValueFromSource } = serverless.variables

  serverless.variables.getValueFromSource = (variableString) => {
    if (variableString.startsWith(`secrets:`)) {
      return getSecretFromEnterprise({
        secretName: variableString.split(`secrets:`)[1],
        ..._.pick(serverless.service, ['tenant', 'app', 'service'])
      })
    }

    return getValueFromSource.bind(serverless.variables)(variableString)
  }

  // return a restore function (mostly for testing)
  return () => {
    serverless.variables.getValueFromSource = getValueFromSource
  }
}
