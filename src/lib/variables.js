import { getSecret, getAccessKeyForTenant } from '@serverless/platform-sdk'

export const getSecretFromEnterprise = async ({ secretName, tenant }) => {
  const accessKey = await getAccessKeyForTenant(tenant)
  return getSecret({ secretName, accessKey })
}

export const hookIntoVariableGetter = (serverless) => {
  const { getValueFromSource } = serverless.variables

  serverless.variables.getValueFromSource = (variableString) => {
    if (variableString.startsWith(`secrets:`)) {
      return getSecretFromEnterprise({
        secretName: variableString.split(`secrets:`)[1],
        tenant: serverless.service.tenant
      })
    }

    return getValueFromSource.bind(serverless.variables)(variableString)
  }

  // return a restore function (mostly for testing)
  return () => {
    serverless.variables.getValueFromSource = getValueFromSource
  }
}
