import _ from 'lodash'
import { getAccessKeyForTenant, getDeployProfile } from '@serverless/platform-sdk'
import { hookIntoVariableGetter } from './variables'

export const configureDeployProfile = async (ctx) => {
  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant)
  const deploymentProfile = await getDeployProfile({
    accessKey,
    stage: ctx.provider.getStage(),
    ..._.pick(ctx.sls.service, ['tenant', 'app', 'service'])
  })
  // TODO - what's the real name?!
  if (deploymentProfile.credentials) {
    // TODO - is it the right shap to just assign it like this?
    ctx.sls.service.provider.credentials = deploymentProfile.credentials
  }
  ctx.safeguards = deploymentProfile.safeguardsPolicies
  hookIntoVariableGetter(
    ctx,
    _.fromPairs(
      deploymentProfile.secretValues.map(({ secretName, secretProperties: { value } }) => [
        secretName,
        value
      ])
    )
  )
}
