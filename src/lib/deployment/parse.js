/*
 * Save Deployment
 * - This uses the new deployment data model.
 */

import _ from 'lodash'
import SDK from '@serverless/platform-sdk'
import { version as packageJsonVersion } from '../../../package.json'

/*
 * Parse Deployment Data
 * - Takes data from the Framework and formats it into our data model
 */

const parseDeploymentData = async (ctx, status = 'success', error = null, archived = false) => {
  const { service } = ctx.sls
  const deployment = new SDK.Deployment()

  const accountId = await ctx.provider.getAccountId()
  /*
   * Add deployment data...
   */

  if (!archived) {
    const cfnStack = await ctx.provider.request('CloudFormation', 'describeStacks', {
      StackName: ctx.provider.naming.getStackName()
    })
    const apigResource = _.find(cfnStack.Stacks[0].Outputs, ({ OutputKey }) =>
      OutputKey.match(ctx.provider.naming.getServiceEndpointRegex())
    )
    const apiId = apigResource && apigResource.OutputValue.split('https://')[1].split('.')[0]

    deployment.set({
      versionFramework: ctx.sls.version,
      versionEnterprisePlugin: packageJsonVersion,
      tenantUid: service.tenantUid,
      appUid: service.appUid,
      tenantName: service.tenant,
      appName: service.app,
      serviceName: service.service,
      stageName: service.provider.stage,
      regionName: service.provider.region,
      archived,
      status,
      provider: {
        type: 'aws',
        aws: { accountId }
        // environment: Object.keys(service.provider.environment || {})
      },
      layers: service.layers || {},
      plugins: service.plugins || [],
      custom: service.custom || {},
      safeguards: ctx.state.safeguardsResults,
      secrets: ctx.state.secretsUsed,
      error
    })

    /*
     * Add this deployment's functions...
     */

    for (const fnName in service.functions) {
      const fn = service.functions[fnName]
      fn.events = fn.events || []

      // Function
      deployment.setFunction({
        name: fnName,
        description: fn.description || null,
        type: 'awsLambda',
        custom: {
          handler: fn.handler,
          memorySize: fn.memory,
          runtime: fn.runtime,
          timeout: fn.timeout,
          environment: Object.keys(fn.environment || {}),
          role: fn.role,
          onError: fn.onError,
          awsKmsKeyArn: fn.awsKmsKeyArn,
          tags: fn.tags || {},
          vpc: fn.vpc || {},
          layers: fn.layers || []
        }
      })

      /*
       * Add this functions's subscriptions...
       */

      for (const sub of fn.events) {
        const type = Object.keys(sub)[0]
        let subDetails = {}
        if (type === 'http') {
          subDetails = {
            path: sub.http.path,
            method: sub.http.method,
            cors: sub.http.cors,
            integration: sub.http.integration,
            restApiId: apiId
          }
        }

        deployment.setSubscription({ type: type, function: fnName, ...subDetails })
      }
    }
  } else {
    deployment.set({
      versionFramework: ctx.sls.version,
      versionEnterprisePlugin: packageJsonVersion,
      tenantUid: service.tenantUid,
      appUid: service.appUid,
      tenantName: service.tenant,
      appName: service.app,
      serviceName: service.service,
      stageName: service.provider.stage,
      regionName: service.provider.region,
      archived,
      status,
      secrets: ctx.state.secretsUsed,
      error
    })
  }

  return deployment
}

export default parseDeploymentData
