/*
 * Wrap Clean
 * - Cleans up files create during wrapping
 */

import fs from 'fs-extra'
import path from 'path'

export default async (ctx) => {
  // Clear assets (serverless-sdk)
  if (fs.existsSync(ctx.state.pathAssets)) {
    fs.removeSync(ctx.state.pathAssets)
  }

  for (const func in ctx.state.functions) {
    const fn = ctx.state.functions[func]

    let file
    if (fn.runtime.includes('node')) {
      file = fn.entryNew + '.js'
    }

    const filePath = path.join(ctx.sls.config.servicePath, file)

    // Clear wrapper file for this function
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath)
    }
  }
}
