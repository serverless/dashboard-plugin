/*
 * Wrap Clean
 * - Cleans up files create during wrapping
 */

const fs = require('fs-extra')
const os = require('os')
const path = require('path')

module.exports = async (ctx) => {
  // Clear assets (serverless-sdk)
  if (fs.pathExistsSync(ctx.state.pathAssets)) {
    fs.removeSync(ctx.state.pathAssets)
  }

  for (const f in ctx.state.functions) {
    const fn = ctx.state.functions[f]

    let file
    if (fn.runtime.includes('node')) {
      file = fn.entryNew + '.js'
    }

    const filePath = path.join(ctx.sls.config.servicePath, file)

    // Clear wrapper file for this function
    if (fs.pathExistsSync(filePath)) {
      fs.removeSync(filePath)
    }
  }
}
