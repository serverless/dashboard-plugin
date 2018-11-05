'use strict'
import _ from 'lodash'
import debugLib from 'debug'
import cosmiconfig from 'cosmiconfig'
import thisPkg from '../package'
import fs from 'fs-extra'
import handlerCode from './handlerCode'
import { join, posix } from 'path'

function createDebugger(suffix) {
  return debugLib(`serverless-plugin-apm:${suffix}`)
}

function outputHandlerCode(obj = {}, apmConfig) {
  const { name, relativePath, method } = obj
  const fnName = _.camelCase(`attempt-${name}`)

  return handlerCode
    .replace(/EXPORT_NAME/g, name)
    .replace(/FUNCTION_NAME/g, fnName)
    .replace(/RELATIVE_PATH/g, relativePath)
    .replace(/METHOD/g, method)
    .replace(/SERVICE_NAME/g, apmConfig.serviceNane)
    .replace(/APPLICATION_NAME/g, apmConfig.appName)
    .replace(/TENANT_NAME/g, apmConfig.tenantId)
    .replace(/REGION/g, apmConfig.region)
    .replace(/PROVIDER/g, apmConfig.provider)
}
class ServerlessApmPlugin {
  constructor(sls, options) {
    this.sls = sls
    this.options = options
    this.originalServicePath = this.sls.config.servicePath

    this.commands = {
      apm: {
        usage: 'Wraps your function',
        lifecycleEvents: ['run']
      }
    }

    this.hooks = {
      'apm:run': this.run.bind(this),
      'before:package:createDeploymentArtifacts': this.run.bind(this),
      'before:deploy:function:packageFunction': this.run.bind(this),
      'before:invoke:local:invoke': this.run.bind(this),
      'before:offline:start:init': this.run.bind(this),
      'before:step-functions-offline:start': this.run.bind(this),
      'after:package:createDeploymentArtifacts': this.finish.bind(this),
      'after:invoke:local:invoke': this.finish.bind(this)
    }
  }

  run() {
    this.setOptions({})
    this.getApmConfig()
    this.getFuncs()
    this.log('Wrapping your functions...')
    this.createFiles()
    this.assignHandlers()
  }

  getApmConfig() {
    this.apmConfig = {
      stage: this.sls.service.provider.stage,
      region: this.sls.service.provider.region,
      provider: this.sls.service.provider.name,
      serviceNane: this.sls.service.service,
      appName: this.sls.service.app,
      tenantId: this.sls.service.tenant
    }
  }

  setOptions(opts) {
    const debug = createDebugger('setOptions')
    const custom = _.chain(this.sls)
      .get('service.custom')
      .pickBy((val, key) => key.match(/^apm/))
      .mapKeys((val, key) => _.camelCase(key.replace(/^apm/, '')))
      .mapValues((val, key) => {
        if (key === 'exclude' && _.isString(val)) {
          return val.split(',')
        }
        return val
      })
      .value()
    const envVars = _.chain(process.env)
      .pickBy((val, key) => key.match(/^APM/))
      .mapKeys((val, key) => _.camelCase(key.replace(/^APM/, '')))
      .value()
    const val = _.defaults(opts, custom, envVars)
    debug('Options object:', val)
    this.getOptions(val)
  }

  getFuncs() {
    try {
      const { servicePath } = this.sls.config
      this.funcs = _.chain(this.sls.service.functions)
        // .omit(this.getOptions().exclude)
        .toPairs()
        //filter out functions that are not Node.js
        .reject((arr) => {
          const key = arr[0]
          const obj = arr[1]
          if (_.isString(obj.runtime) && !obj.runtime.match('node')) {
            this.log(
              `Function "${key}" is not Node.js. Currently the plugin only supports Node.js functions. Skipping ${key}.`
            )
            return true
          }
          return false
        })
        .map((arr) => {
          const [key, obj] = arr
          const handlerArr = _.isString(obj.handler) ? obj.handler.split('.') : []
          const relativePath = handlerArr.slice(0, -1).join('.')
          const path = `${servicePath}/${relativePath}.js`
          return _.assign({}, obj, {
            method: _.last(handlerArr),
            path,
            name: key,
            relativePath,
            file: _.last((handlerArr.slice(-2, -1)[0] || '').split('/'))
          })
        })
        .value()
      console.log(this.funcs)
    } catch (err) {
      /*eslint-disable no-console*/
      console.error('Failed to read functions from serverless.yml.')
      /*eslint-enable no-console*/
      throw new Error(err)
    }
  }

  createFiles() {
    const debug = createDebugger('createFiles')
    debug('Creating file')
    const { inlineConfig } = this.getConfig()
    const { handlerDir } = this.getOptions()
    const apmInclude = `const apm = require('elastic-apm-node');`

    this.funcs.forEach((func) => {
      const handler = outputHandlerCode(func, this.apmConfig)
      const contents = `${apmInclude}\n\n${handler}`
      fs.ensureDirSync(join(this.originalServicePath, handlerDir))
      fs.writeFileSync(
        join(this.originalServicePath, join(handlerDir, `${func.name}-apm.js`)),
        contents
      )
    })
  }

  log(arg1, ...rest) {
    //sls doesn't actually support multiple args to log?
    /*eslint-disable no-console*/
    const logger =
      this.sls.cli.log || // console.log
      /*eslint-enable no-console*/
      logger.call(this.sls.cli, `serverless-plugin-apm: ${arg1}`, ...rest)
  }

  getConfig() {
    const { token } = this.getOptions()
    const { config: cosmi = {} } =
      cosmiconfig('apm', {
        cache: false,
        sync: true,
        rcExtensions: true
      }).load(process.cwd()) || {}

    const plugins = (cosmi.plugins || []).map((plugin) => {
      // plugins can be specified as strings or as arrays with 2 entries
      // create require calls for each scenario
      const pluginModule = _.isArray(plugin) ? plugin[0] : plugin
      const pluginConfig = _.isArray(plugin) ? JSON.stringify(plugin[1]) : ''
      return `require('${pluginModule}')(${pluginConfig})`
    })

    const inlineConfigObject = _.pickBy(
      _.assign({}, cosmi, {
        token,
        installMethod: `${thisPkg.name}@${thisPkg.version}`,
        // ⬇ this will be replaced with plugin require block that cannot be JSON.stringified
        plugins: 'xxx'
      })
    )

    let inlineConfig = JSON.stringify(inlineConfigObject)
    inlineConfig = inlineConfig.replace(/"plugins":"xxx"/, `"plugins":[${plugins.join(',')}]`)

    return {
      inlineConfig
    }
  }

  getOptions(obj = this.options) {
    this.options = _.chain(obj)
      .defaults(this.options)
      .defaults({
        quote: 'single',
        handlerDir: 'apm_handlers'
      })
      .mapKeys((val, key) => _.camelCase(key))
      .value()
    return this.options
  }

  assignHandlers() {
    const debug = createDebugger('assignHandlers')
    debug('Assigning apm handlers to sls service')
    const { handlerDir } = this.getOptions()

    console.log('before func', this.funcs)
    this.funcs.forEach((obj) => {
      _.set(
        this.sls.service.functions,
        `${obj.name}.handler`,
        posix.join(handlerDir, `${obj.name}-apm.${obj.name}`)
      )
    })
    console.log('after func', this.funcs)
  }

  finish() {
    const debug = createDebugger('finish')
    this.log('Cleaning up extraneous apm files')
    debug(`Removing ${this.handlerFileName}.js`)
    const { handlerDir = 'apm_handlers' } = this.getOptions()
    fs.removeSync(join(this.originalServicePath, handlerDir))
  }
}

module.exports = ServerlessApmPlugin
