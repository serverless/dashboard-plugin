/*
* Save Deployment
* - This uses the new deployment data model.
*/

import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import SDK from '@serverless/platform-sdk'
import { version as packageJsonVersion } from '../../package.json'

export default async function(ctx) {

  ctx.sls.cli.log('Publishing service to the Enterprise Dashboard...', 'Serverless Enterprise')

  let deployment
  try {
    deployment = await parseDeploymentData(ctx)
  } catch(error) {
    throw new Error(error)
  }

  const result = await deployment.save()

  ctx.sls.cli.log(
        `Successfully published your service to the Enterprise Dashboard: ${result.dashboardUrl}`, // eslint-disable-line
    'Serverless Enterprise'
  )
}

/*
* Parse Deployment Data
* - Takes data from the Framework and formats it into our data model
*/

const parseDeploymentData = async (ctx) => {

  const service = ctx.sls.service
  const deployment = new SDK.Deployment()

  const cfResources = await ctx.provider.getStackResources()
  const accountId = await ctx.provider.getAccountId()
  const cfnStack = await ctx.provider.request('CloudFormation', 'describeStacks', {
    StackName: ctx.provider.naming.getStackName()
  })
  const apiId = _.find(cfnStack.Stacks[0].Outputs, ({ OutputKey }) =>
    OutputKey.match(ctx.provider.naming.getServiceEndpointRegex())
  )
    .OutputValue.split('https://')[1]
    .split('.')[0]

  /*
  * Add deployment data...
  */

  const dInstance = {}

  dInstance.versionFramework = ctx.sls.version
  dInstance.versionEnterprisePlugin = packageJsonVersion
  dInstance.tenantUid = service.tenantUid
  dInstance.appUid = service.appUid
  dInstance.tenantName  = service.tenant
  dInstance.appName  = service.app
  dInstance.serviceName  = service.service
  dInstance.stageName = service.provider.stage
  dInstance.regionName = service.provider.region
  dInstance.archived = false
  dInstance.provider = {
    type: 'aws',
    aws: {
      accountId: accountId,
    }
  },
  dInstance.layers = service.layers || {}
  dInstance.plugins = service.plugins || []
  dInstance.custom = service.custom || {}

  deployment.set(dInstance)

  /*
  * Add this deployment's functions...
  */

  for (const fnName in service.functions) {

    const fn = service.functions[fnName]
    fn.events = fn.events || []

    // Function
    const fInstance = {
      name: fnName,
      description: fn.description || null,
      type: 'awsLambda',
      custom: {
        handler: fn.handler,
        memorySize: fn.memory,
        runtime: fn.runtime,
        timeout: fn.timeout,
        role: null,
        onError: null,
        awsKmsKeyArn: null,
        tags: Object.assign({}, fn.tags = {}),
        vpc: {
          securityGroupIds: [],
          subnetIds: []
        },
        layers: []
      }
    }

    deployment.setFunction(fInstance)

    /*
    * Add this functions's subscriptions...
    */

    for (let sub of fn.events) {

      const sInstance = {}
      const type = Object.keys(sub)[0]
      sub = sub[type]

      // Required properties
      sInstance.type = type
      sInstance.function = fInstance.name

      if (type === 'http') {
        sInstance.path = sub.path
        sInstance.method = sub.method
        sInstance.cors = sub.cors
        sInstance.integration = sub.integration
        sInstance.restApiId = apiId
      }

      deployment.setSubscription(sInstance)
    }
  }

  return deployment
}
