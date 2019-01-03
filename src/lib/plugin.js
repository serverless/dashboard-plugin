import awsApiGatewayLogsCollection from './awsApiGatewayLogsCollection'
import awsLambdaLogsCollection from './awsLambdaLogsCollection'
import wrap from './wrap.js'
import wrapClean from './wrapClean.js'
import runPolicies from './safeguards.js'
import getCredentials from './credentials.js'
import getAppUid from './appUid.js'
import removeDestination from './removeDestination.js'

/*
 * Serverless Platform Plugin
 */

class ServerlessPlatformPlugin {
  constructor(sls) {
    // Defaults
    this.sls = sls
    this.state = {}
    this.provider = this.sls.getProvider('aws')

    // Check if Platform is configured
    const missing = []
    if (!this.sls.service.tenant) {
      missing.push('tenant')
    }
    if (!this.sls.service.app) {
      missing.push('app')
    }
    if (!this.sls.service.service) {
      missing.push('service')
    }
    if (missing.length > 0) {
      this.sls.cli.log(
        `Warning: The Serverless Platform Plugin requires a ${missing
          .map((opt) => `"${opt}"`)
          .join(', ')} property in your "serverless.yml" and will not work without it.`
      )
    }

    // Set Plugin hooks for all Platform Plugin features here
    this.hooks = {
      'before:package:createDeploymentArtifacts': this.route(
        'before:package:createDeploymentArtifacts'
      ).bind(this),
      'after:package:createDeploymentArtifacts': this.route(
        'after:package:createDeploymentArtifacts'
      ).bind(this),
      'before:deploy:function:packageFunction': this.route(
        'before:deploy:function:packageFunction'
      ).bind(this),
      'before:invoke:local:invoke': this.route('before:invoke:local:invoke').bind(this),
      'before:aws:package:finalize:saveServiceState': this.route(
        'before:aws:package:finalize:saveServiceState'
      ).bind(this),
      'before:deploy:deploy': this.route('before:deploy:deploy').bind(this),
      'before:info:info': this.route('before:info:info').bind(this),
      'before:logs:logs': this.route('before:logs:logs').bind(this),
      'before:metrics:metrics': this.route('before:metrics:metrics').bind(this),
      'before:remove:remove': this.route('before:remove:remove').bind(this),
      'after:remove:remove': this.route('after:remove:remove').bind(this),
      'after:invoke:local:invoke': this.route('after:invoke:local:invoke').bind(this),
      'before:offline:start:init': this.route('before:offline:start:init').bind(this),
      'before:step-functions-offline:start': this.route('before:step-functions-offline:start').bind(
        this
      )
    }
  }

  /*
   * Route
   */

  route(hook) {
    const self = this
    return async () => {
      switch (hook) {
        case 'before:package:createDeploymentArtifacts':
          self.sls.service.appUid = await getAppUid(self.sls.service.tenant, self.sls.service.app)
          await wrap(self)
          break
        case 'after:package:createDeploymentArtifacts':
          await wrapClean(self)
          break
        case 'before:deploy:function:packageFunction':
          // await wrap(self)
          break
        case 'before:aws:package:finalize:saveServiceState':
          await getCredentials(self)
          await awsApiGatewayLogsCollection(self)
          await awsLambdaLogsCollection(self)
          break
        case 'before:deploy:deploy':
          await runPolicies(self)
          break
        case 'before:info:info':
          await getCredentials(self)
          break
        case 'before:logs:logs':
          await getCredentials(self)
          break
        case 'before:metrics:metrics':
          await getCredentials(self)
          break
        case 'before:remove:remove':
          await getCredentials(self)
          break
        case 'after:remove:remove':
          self.sls.service.appUid = await getAppUid(self.sls.service.tenant, self.sls.service.app)
          await removeDestination(self)
          break
        case 'before:invoke:local:invoke':
          self.sls.service.appUid = '000000000000000000'
          await wrap(self)
          break
        case 'after:invoke:local:invoke':
          await wrapClean(self)
          break
        case 'before:offline:start:init':
          // await wrap(self)
          break
        case 'before:step-functions-offline:start':
          // await wrap(self)
          break
      }
    }
  }
}

export default ServerlessPlatformPlugin
