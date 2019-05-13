/*
 * Wrap
 * - Bundles the ServerlessSDK into your functions
 * - Wraps your function handlers with the ServerlessSDK
 */

import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'
import JSZip from 'jszip'
import { addTree, writeZip } from './zipTree'

/*
 * Wrap Node.js Functions
 */

export const wrapNodeJs = (fn, ctx) => {
  const newHandlerCode = `var serverlessSDK = require('./serverless-sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: '${ctx.sls.service.tenant}',
applicationName: '${ctx.sls.service.app}',
appUid: '${ctx.sls.service.appUid}',
tenantUid: '${ctx.sls.service.tenantUid}',
serviceName: '${ctx.sls.service.service}',
stageName: '${ctx.provider.getStage()}'})
module.exports.handler = serverlessSDK.handler(require('./${fn.entryOrig}.js').${
    fn.handlerOrig
  }, { functionName: '${fn.name}', timeout: '${fn.timeout}'})`

  // Create new handlers
  fs.writeFileSync(path.join(ctx.sls.config.servicePath, `${fn.entryNew}.js`), newHandlerCode)
}

export default async (ctx) => {
  // Check if we support the provider
  if (ctx.sls.service.provider.name !== 'aws') {
    ctx.sls.cli.log(
      'Warning: The Serverless Platform Plugin does not current support this provider.'
    )
  }

  /*
   * Prepare Functions
   */
  const { functions } = ctx.sls.service
  ctx.state.functions = {}
  for (const func in functions) {
    const runtime = functions[func].runtime
      ? functions[func].runtime
      : ctx.sls.service.provider.runtime
    if (!runtime.includes('nodejs')) {
      continue
    }

    // the default is 6s: https://serverless.com/framework/docs/providers/aws/guide/serverless.yml/
    const timeout = functions[func].timeout ? functions[func].timeout : 6

    // Process name
    let name
    if (functions[func].name) {
      ;({ name } = functions[func])
    } else {
      name = `${ctx.sls.service.service}-${ctx.sls.service.provider.stage}-${func}`
    }

    // Process handler
    const entry = functions[func].handler.split('.')[0]
    const handler = functions[func].handler.split('.')[1]

    ctx.state.functions[func] = {
      key: func,
      name: name,
      runtime: runtime,
      timeout: timeout,
      entryOrig: entry,
      handlerOrig: handler,
      entryNew: `s-${func}`,
      handlerNew: `handler`
    }
  }

  /*
   * Wrap Functions
   */

  ctx.state.pathAssets = path.join(ctx.sls.config.servicePath, 'serverless-sdk')

  // Clear existing handler dir
  if (fs.pathExistsSync(ctx.state.pathAssets)) {
    fs.removeSync(ctx.state.pathAssets)
  }

  // Create new handler dir
  fs.ensureDirSync(ctx.state.pathAssets)

  // Copy SDK
  const pathSdk = path.resolve(__dirname, '../../sdk-js/dist/index.js')
  const pathSdkDest = path.join(ctx.state.pathAssets, './index.js')
  fs.copySync(pathSdk, pathSdkDest)

  // Prepare & Copy Function Handlers
  for (var fn in ctx.state.functions) {
    const func = ctx.state.functions[fn]

    if (!func.runtime.includes('nodejs')) {
      return
    }

    // Add the Serverless SDK wrapper around the function
    wrapNodeJs(func, ctx)

    // Re-assign the handler to point to the wrapper
    ctx.sls.service.functions[fn].handler = `${func.entryNew}.${func.handlerNew}`

    if (_.get(ctx.sls.service.functions[fn], 'package.artifact')) {
      const zipData = await fs.readFile(ctx.sls.service.functions[fn].package.artifact)
      const zip = await JSZip.loadAsync(zipData)
      const wrapperData = await fs.readFile(
        path.join(ctx.sls.config.servicePath, `${func.entryNew}.js`)
      )
      zip.file(`${func.entryNew}.js`, wrapperData)
      await addTree(zip, 'serverless-sdk')
      await writeZip(zip, ctx.sls.service.functions[fn].package.artifact)
    } else if (
      _.get(
        ctx.sls.service.functions[fn],
        'package.individually',
        _.get(ctx.sls.service, 'package.individually', false)
      )
    ) {
      // add include directives for handler file & sdk lib
      if (ctx.sls.service.functions[fn].package === undefined) {
        ctx.sls.service.functions[fn].package = {}
      }
      if (ctx.sls.service.functions[fn].package.include === undefined) {
        ctx.sls.service.functions[fn].package.include = []
      }
      ctx.sls.service.functions[fn].package.include.push(`${func.entryNew}.js`)
      ctx.sls.service.functions[fn].package.include.push('serverless-sdk/**')
    }
  }

  // add include directives for handler file & sdk lib
  if (!_.get(ctx.sls.service, 'package.individually', false)) {
    if (ctx.sls.service.package === undefined) {
      ctx.sls.service.package = {}
    }
    if (ctx.sls.service.package.include === undefined) {
      ctx.sls.service.package.include = []
    }
    ctx.sls.service.package.include.push('s-*.js')
    ctx.sls.service.package.include.push('serverless-sdk/**')
  }
}
