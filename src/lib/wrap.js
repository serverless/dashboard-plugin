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

  // Check if we support the runtime
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
    if (runtime.includes('nodejs')) entry = entry + '.js'
    handler = functions[f].handler.split('.')[1]

    ctx.state.functions[f] = {
      key: f,
      name: name,
      entry: entry,
      handler: handler,
      runtime: runtime,
      newFile: `s-${f}-${Date.now()}`,
      newHandler: `handler`,
    }
  }

  // Clear existing handler dir
  // if (fs.pathExistsSync(ctx.config.packager.pathAssets)) fs.removeSync(ctx.config.packager.pathAssets)

}


// const package = () => {
//   return new Promise((resolve, reject) => {
//
//     console.log('here', this)
//     resolve()
//
//   })
//
//
//   console.log(this)
//
//   // Clear existing handler dir
//   if (fs.pathExistsSync(ctx.config.packager.pathAssets)) fs.removeSync(ctx.config.packager.pathAssets)
//
//   // Create new handler dir
//   fs.ensureDirSync(ctx.config.packager.pathAssets)
//
//   // Copy SDK
//   const originalSdkPath = path.resolve(__dirname, '../sdk-js/dist/index.js')
//   const newSdkPath = path.join(ctx.config.packager.pathAssets, './index.js')
//   fs.copySync(originalSdkPath, newSdkPath)
//
//   // Prepare & Copy Function Handlers
//   for (var fn in ctx.config.packager.functions) {
//
//     let func = ctx.config.packager.functions[fn]
//
//     if (!ctx.config.packager.functions[fn].runtime.includes('nodejs')) return
//     ctx.prepareNodeHandler(ctx.config.packager.functions[fn])
//
//     // TODO: Reassign handlers
//     ctx.sls.service.functions[fn].handler = `${func.newFile}.${func.newHandler}`
//   }
//
//   console.log(ctx.config.packager.functions)
//   console.log(ctx.sls.service.functions)


    /*
    * Prepare Node.js Handler
    */

  //   prepareNodeHandler(fn) {
  //
  //     const newHandler =
  //     `var serverlessSDK = require('./serverless-sdk/index.js')
  // serverlessSDK = new serverlessSDK({
  //   tenantId: '${this.config.tenant}',
  //   applicationName: '${this.config.app}',
  //   serviceName: '${this.config.service}',
  //   stageName: '${this.config.stage}',
  // })
  // module.exports.handler = serverlessSDK.handler(require('./${fn.entry}').${fn.handler}, { functionName: '${fn.name}' })`
  //
  //     // Create new handlers
  //     fs.writeFileSync(
  //       path.join(this.config.servicePath, `${fn.newFile}.js`),
  //       newHandler
  //     )
  //   }
// }
