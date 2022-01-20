'use strict';

/*
 * Wrap Clean
 * - Cleans up files create during wrapping
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = async (ctx) => {
  // Clear assets (serverless-sdk)
  if (fs.pathExistsSync(ctx.state.pathAssets)) {
    fs.removeSync(ctx.state.pathAssets);
  }

  for (const func of Object.keys(ctx.state.functions)) {
    const fn = ctx.state.functions[func];

    let file;
    if (fn.runtime.includes('node')) {
      file = `${fn.entryNew}.js`;
    } else if (fn.runtime.includes('python')) {
      file = `${fn.entryNew}.py`;
    }

    const filePath = path.join(ctx.sls.config.servicePath, file);

    // Clear wrapper file for this function
    if (fs.pathExistsSync(filePath)) {
      fs.removeSync(filePath);
    }
  }
};
