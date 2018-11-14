/*
* Packager
* - Bundles the ServerlessSDK into your functions
* - Configures MALT features
*/

/*
* Init
*/

const init = (that) => {


  return

  // Check if we support the provider
  // if (this.sls.service.provider.name !== 'aws') {
  //   this.sls.cli.log('Warning: The Serverless Platform Plugin does not current support this provider.')
  // }
  //
  // // Check if we support the runtime
  // const functions = this.sls.service.functions
  // for (let f in functions) {
  //
  //   // Check runtime
  //   let runtime = functions[f].runtime ? functions[f].runtime : this.sls.service.provider.runtime
  //   if (!runtime.includes('nodejs')) return
  //
  //   // Process name
  //   let name
  //   if (functions[f].name) { name = functions[f].name }
  //   else {
  //     name = `${this.sls.service.service}-${this.sls.service.provider.stage}-${f}`
  //   }
  //
  //   // Process handler
  //   let entry
  //   let handler
  //   entry = functions[f].handler.split('.')[0]
  //   if (runtime.includes('nodejs')) entry = entry + '.js'
  //   handler = functions[f].handler.split('.')[1]
  //
  //   this.config.functions[f] = {
  //     key: f,
  //     name: name,
  //     entry: entry,
  //     handler: handler,
  //     runtime: runtime,
  //     newFile: `s-${f}-${Date.now()}`,
  //     newHandler: `handler`,
  //   }
  // }
  // if (!Object.keys(this.config.functions).length) return
  //
  // // Define hooks that will wrap functions
  // this.hooks = {
  //   'before:package:createDeploymentArtifacts': this.wrap.bind(this),
  //   'before:deploy:function:packageFunction': this.wrap.bind(this),
  //   'before:invoke:local:invoke': this.wrap.bind(this),
  //   'before:offline:start:init': this.wrap.bind(this),
  //   'before:step-functions-offline:start': this.wrap.bind(this),
  //   'after:package:createDeploymentArtifacts': this.finish.bind(this),
  //   'after:invoke:local:invoke': this.finish.bind(this)
  // }
}

/*
* Wrap
*/

const wrap = () => {

    // Clear existing handler dir
    // if (fs.pathExistsSync(this.config.assetsDir)) fs.removeSync(this.config.assetsDir)
    //
    // // Create new handler dir
    // fs.ensureDirSync(this.config.assetsDir)
    //
    // // Copy SDK
    // const originalSdkPath = path.resolve(__dirname, '../sdk-js/dist/index.js')
    // const newSdkPath = path.join(this.config.assetsDir, './index.js')
    // fs.copySync(originalSdkPath, newSdkPath)
    //
    // // Prepare & Copy Function Handlers
    // for (var fn in this.config.functions) {
    //
    //   let func = this.config.functions[fn]
    //
    //   if (!this.config.functions[fn].runtime.includes('nodejs')) return
    //   this.prepareNodeHandler(this.config.functions[fn])
    //
    //   // TODO: Reassign handlers
    //   this.sls.service.functions[fn].handler = `${func.newFile}.${func.newHandler}`
    // }
    //
    // console.log(this.config.functions)
    // console.log(this.sls.service.functions)


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
}

module.exports = {
  init,
  wrap,
}
