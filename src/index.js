const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const packager = require('./lib/packager.js')

/*
* Serverless Platform Plugin
*/

class ServerlessPlatformPlugin {

  constructor(sls) {

    // Defaults
    this.sls = sls
    this.config = {
      packager: {
        enabled: true,
        assetsDir: path.join(this.sls.config.servicePath, 'serverless-sdk')
      }
    }

    // Check if Platform is configured
    let missing
    if (!this.sls.service.tenant) missing = 'tenant'
    if (!this.sls.service.app) missing = 'app'
    if (!this.sls.service.service) missing = 'service'
    if (missing) {
      this.sls.cli.log(`Warning: The Serverless Platform Plugin requires a "${missing}" property in your "serverless.yml" and will not work without it.`)
    }

    // Init Features
    if (this.config.packager.enabled) this.packager()

    // Init other features here...

  }

  /*
  * Packager
  */

  packager() {
    packager.init()
  }
}

module.exports = ServerlessPlatformPlugin
