/*
* Wrap
* - Bundles the ServerlessSDK into your functions
* - Wraps your function handlers with the ServerlessSDK
*/

const fs = require('fs-extra')
const os = require('os')
const path = require('path')

module.exports = async (ctx) => {

  // Check if we support the provider
  if (ctx.sls.service.provider.name !== 'aws') {
    ctx.sls.cli.log('Warning: The Serverless Platform Plugin does not current support this provider.')
  }

  /*
  * Prepare Functions
  */

  const functions = ctx.sls.service.functions
  ctx.state.functions = {}
  for (let f in functions) {

    let runtime = functions[f].runtime ? functions[f].runtime : ctx.sls.service.provider.runtime
    if (!runtime.includes('nodejs')) return

    // Process name
    let name
    if (functions[f].name) { name = functions[f].name }
    else {
      name = `${ctx.sls.service.service}-${ctx.sls.service.provider.stage}-${f}`
    }

    // Process handler
    let entry
    let handler
    entry = functions[f].handler.split('.')[0]
    handler = functions[f].handler.split('.')[1]

    ctx.state.functions[f] = {
      key: f,
      name: name,
      runtime: runtime,
      entryOrig: entry,
      handlerOrig: handler,
      entryNew: `s-${f}`,
      handlerNew: `handler`,
    }
  }

  /*
  * Wrap Functions
  */

  ctx.state.pathAssets = path.join(ctx.sls.config.servicePath, 'serverless-sdk')

  // Clear existing handler dir
  if (fs.pathExistsSync(ctx.state.pathAssets)) fs.removeSync(ctx.state.pathAssets)

  // Create new handler dir
  fs.ensureDirSync(ctx.state.pathAssets)

  // Copy SDK
  const pathSdk = path.resolve(__dirname, '../../sdk-js/dist/index.js')
  const pathSdkDest = path.join(ctx.state.pathAssets, './index.js')
  fs.copySync(pathSdk, pathSdkDest)

  // Prepare & Copy Function Handlers
  for (var fn in ctx.state.functions) {

    let func = ctx.state.functions[fn]

    if (!func.runtime.includes('nodejs')) return

    // Add the Serverless SDK wrapper around the function
    wrapNodeJs(func, ctx)

    // Re-assign the handler to point to the wrapper
    ctx.sls.service.functions[fn].handler = `${func.entryNew}.${func.handlerNew}`
  }
}

/*
* Wrap Node.js Functions
*/

const wrapNodeJs = (fn, ctx) => {

  const newHandlerCode =
  `var serverlessSDK = require('./serverless-sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: '${ctx.sls.service.tenant}',
applicationName: '${ctx.sls.service.app}',
serviceName: '${ctx.sls.service.service}',
stageName: '${ctx.sls.service.provider.stage}',
})
module.exports.handler = serverlessSDK.handler(require('./${fn.entryOrig}.js').${fn.handlerOrig}, { functionName: '${fn.name}' })`

  // Create new handlers
  fs.writeFileSync(
    path.join(ctx.sls.config.servicePath, `${fn.entryNew}.js`),
    newHandlerCode
  )
}
