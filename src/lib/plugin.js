import { configureFetchDefaults, getLoggedInUser } from '@serverless/platform-sdk'
import errorHandler from './errorHandler'
// import awsApiGatewayLogsCollection from './awsApiGatewayLogsCollection'
import awsLambdaLogsCollection from './awsLambdaLogsCollection'
import login from './login'
import logout from './logout'
import wrap from './wrap'
import injectLogsIamRole from './injectLogsIamRole'
import wrapClean from './wrapClean'
import runPolicies from './safeguards'
import getCredentials from './credentials'
import getAppUids from './appUids'
import removeDestination from './removeDestination'
import { saveDeployment } from './deployment'
import { hookIntoVariableGetter } from './variables'

/*
 * Serverless Enterprise Plugin
 */

class ServerlessEnterprisePlugin {
  constructor(sls) {
    configureFetchDefaults()
    const user = getLoggedInUser()
    const currentCommand = sls.processedInput.commands[0]

    // Skip everything if user is not logged in and not trying to log in or out...
    if (
      !user &&
      (currentCommand !== 'login' &&
        currentCommand !== 'logout' &&
        !process.env.SERVERLESS_ACCESS_KEY)
    ) {
      const errorMessage = `You are not currently logged in. To log in, use: $ serverless login`
      console.log('') // eslint-disable-line
      sls.cli.log(errorMessage, 'Serverless Enterprise') // eslint-disable-line
      throw new Error(errorMessage) // eslint-disable-line
    }

    // Defaults
    this.sls = sls
    this.state = {} // Useful for storing data across hooks
    this.state.secretsUsed = new Set()
    this.provider = this.sls.getProvider('aws')

    // Check if Enterprise is configured
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
        `Warning: The Enterprise Plugin requires a ${missing
          .map((opt) => `"${opt}"`)
          .join(', ')} property in your "serverless.yml" and will not work without it.`,
        'Serverless Enterprise'
      )
      return
    }

    // Add commands
    this.commands = {
      login: {
        usage: 'Login or sign up for Serverless Enterprise',
        lifecycleEvents: ['login'],
        enterprise: true
      },
      logout: {
        usage: 'Logout from Serverless Enterprise',
        lifecycleEvents: ['logout'],
        enterprise: true
      }
    }

    hookIntoVariableGetter(this)

    // Set Plugin hooks for all Enteprise Plugin features here
    this.hooks = {
      'before:package:createDeploymentArtifacts': this.route('before:package:createDeploymentArtifacts').bind(this), // eslint-disable-line
      'after:package:createDeploymentArtifacts': this.route('after:package:createDeploymentArtifacts').bind(this), // eslint-disable-line
      'before:deploy:function:packageFunction': this.route('before:deploy:function:packageFunction').bind(this), // eslint-disable-line
      'after:deploy:function:packageFunction': this.route('after:deploy:function:packageFunction').bind(this), // eslint-disable-line
      'before:invoke:local:invoke': this.route('before:invoke:local:invoke').bind(this), // eslint-disable-line
      'before:aws:package:finalize:saveServiceState': this.route('before:aws:package:finalize:saveServiceState').bind(this), // eslint-disable-line
      'before:deploy:deploy': this.route('before:deploy:deploy').bind(this), // eslint-disable-line
      'before:aws:deploy:deploy:createStack': this.route('before:aws:deploy:deploy:createStack').bind(this), // eslint-disable-line
      'after:aws:deploy:finalize:cleanup': this.route('after:aws:deploy:finalize:cleanup').bind(this), // eslint-disable-line
      'after:deploy:finalize': this.route('after:deploy:finalize').bind(this), // eslint-disable-line
      'after:deploy:deploy': this.route('after:deploy:deploy').bind(this), // eslint-disable-line
      'before:info:info': this.route('before:info:info').bind(this), // eslint-disable-line
      'before:logs:logs': this.route('before:logs:logs').bind(this), // eslint-disable-line
      'before:metrics:metrics': this.route('before:metrics:metrics').bind(this), // eslint-disable-line
      'before:remove:remove': this.route('before:remove:remove').bind(this), // eslint-disable-line
      'after:remove:remove': this.route('after:remove:remove').bind(this), // eslint-disable-line
      'after:invoke:local:invoke': this.route('after:invoke:local:invoke').bind(this), // eslint-disable-line
      'before:offline:start:init': this.route('before:offline:start:init').bind(this), // eslint-disable-line
      'before:step-functions-offline:start': this.route('before:step-functions-offline:start').bind(this), // eslint-disable-line
      'login:login': this.route('login:login').bind(this), // eslint-disable-line
      'logout:logout': this.route('logout:logout').bind(this), // eslint-disable-line
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
          Object.assign(
            self.sls.service,
            await getAppUids(self.sls.service.tenant, self.sls.service.app)
          )
          await wrap(self)
          await injectLogsIamRole(self)
          break
        case 'after:package:createDeploymentArtifacts':
          await wrapClean(self)
          break
        case 'before:deploy:function:packageFunction':
          await wrap(self)
          break
        case 'after:deploy:function:packageFunction':
          await wrapClean(self)
          break
        case 'before:aws:package:finalize:saveServiceState':
          await getCredentials(self)
          // await awsApiGatewayLogsCollection(self)
          await awsLambdaLogsCollection(self)
          break
        case 'before:deploy:deploy':
          this.enterprise = {
            errorHandler: errorHandler(this) // V.1 calls this when it crashes
          }
          await runPolicies(self)
          break
        case 'before:aws:deploy:deploy:createStack':
          break
        case 'after:aws:deploy:finalize:cleanup':
          await saveDeployment(self)
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
          Object.assign(
            self.sls.service,
            await getAppUids(self.sls.service.tenant, self.sls.service.app)
          )
          await removeDestination(self)
          await saveDeployment(self, true)
          break
        case 'before:invoke:local:invoke':
          Object.assign(self.sls.service, {
            appUid: '000000000000000000',
            tenantUid: '000000000000000000'
          })
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
        case 'login:login':
          await login(self)
          break
        case 'logout:logout':
          await logout(self)
          break
      }
    }
  }
}

export default ServerlessEnterprisePlugin
