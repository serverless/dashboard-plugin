import { exec } from 'child_process';
import { join, posix } from 'path';
import _ from 'lodash';
import fs from 'fs-extra';
import debugLib from 'debug';
import cosmiconfig from 'cosmiconfig';

import thisPkg from '../package';
import { getVisitor, track } from './util/track';
import hrMillis from './util/hrMillis';
import handlerCode from './handlerCode';

function createDebugger(suffix) {
  return debugLib(`serverless-plugin-apm:${suffix}`);
}

function outputHandlerCode(obj = {}) {
  const { name, relativePath, method } = obj;
  const fnName = _.camelCase(`attempt-${name}`);
  return handlerCode
    .replace(/EXPORT_NAME/g, name)
    .replace(/FUNCTION_NAME/g, fnName)
    .replace(/RELATIVE_PATH/g, relativePath)
    .replace(/METHOD/g, method);
}

class ServerlessAPMPlugin {
  constructor(sls = {}, opts) {
    this.sls = sls;
    this.prefix =
      opts.prefix ||
      this.sls.config.servicePath ||
      process.env.npm_config_prefix;
    this.visitor = getVisitor(this);
    this.package = {};
    this.funcs = [];
    this.originalServicePath = this.sls.config.servicePath;
    this.commands = {
      apm: {
        usage:
          "Automatically wraps your function handlers in APM, so you don't have to.",
        lifecycleEvents: ['run', 'clean'],
        commands: {
          clean: {
            usage: 'Cleans up extra APM files if necessary',
            lifecycleEvents: ['init']
          }
        }
      }
    };
    this.hooks = {
      'before:package:createDeploymentArtifacts': this.run.bind(this),
      'before:deploy:function:packageFunction': this.run.bind(this),
      'before:invoke:local:invoke': this.run.bind(this),
      'before:offline:start:init': this.run.bind(this),
      'before:step-functions-offline:start': this.run.bind(this),
      'after:package:createDeploymentArtifacts': this.finish.bind(this),
      'after:invoke:local:invoke': this.finish.bind(this),
      'apm:clean:init': this.finish.bind(this)
    };
  }
  getOptions(obj = this.options) {
    this.options = _.chain(obj)
      .defaults(this.options)
      .defaults({
        quote: 'single',
        handlerDir: 'apm_handlers'
      })
      .mapKeys((val, key) => _.camelCase(key))
      .value();
    return this.options;
  }
  log(arg1, ...rest) {
    //sls doesn't actually support multiple args to log?
    /*eslint-disable no-console*/
    const logger = this.sls.cli.log || console.log;
    /*eslint-enable no-console*/
    logger.call(this.sls.cli, `serverless-plugin-apm: ${arg1}`, ...rest);
  }
  track(kwargs) {
    return track(this, kwargs);
  }
  greeting() {
    this.log(
      'Welcome to the APM Serverless plugin. You can use this plugin for sls invoke local or sls deploy.'
    );
  }
  async run() {
    const start = process.hrtime();
    this.track({
      action: 'run-start'
    });
    this.log('Wrapping your functions with APM|...');
    this.getFuncs();
    this.createFiles();
    this.assignHandlers();
    this.track({
      action: 'run-finish',
      value: hrMillis(start)
    });
  }

  getFuncs() {
    try {
      const { servicePath } = this.sls.config;
      this.funcs = _.chain(this.sls.service.functions)
        .omit(this.getOptions().exclude)
        .toPairs()
        //filter out functions that are not Node.js
        .reject(arr => {
          const key = arr[0];
          const obj = arr[1];
          if (_.isString(obj.runtime) && !obj.runtime.match('node')) {
            this.log(
              `Function "${key}" is not Node.js. Currently the plugin only supports Node.js functions. Skipping ${key}.`
            );
            return true;
          }
          return false;
        })
        .map(arr => {
          const [key, obj] = arr;
          const handlerArr = _.isString(obj.handler)
            ? obj.handler.split('.')
            : [];
          const relativePath = handlerArr.slice(0, -1).join('.');
          const path = `${servicePath}/${relativePath}.js`;
          return _.assign({}, obj, {
            method: _.last(handlerArr),
            path,
            name: key,
            relativePath,
            file: _.last((handlerArr.slice(-2, -1)[0] || '').split('/'))
          });
        })
        .value();
      this.track({
        action: 'funcs-count',
        value: this.funcs.length
      });
    } catch (err) {
      this.track({
        action: 'get-funcs-fail',
        value: err
      });
      /*eslint-disable no-console*/
      console.error('Failed to read functions from serverless.yml.');
      /*eslint-enable no-console*/
      throw new Error(err);
    }
  }

  createFiles() {
    const debug = createDebugger('createFiles');
    debug('Creating file');
    //  const { inlineConfig } = this.getConfig();
    const { handlerDir } = this.getOptions();
    const apmInclude = function(fnName){
      return `var apm = require('elastic-apm-node').start({
        serviceName: '${fnName}',
        secretToken: '',
        serverUrl: ''
      })`
    }
    this.funcs.forEach(func => {
      const handler = outputHandlerCode(func.name);
      const contents = `${apmInclude}\n\n${handler}`;
      fs.ensureDirSync(join(this.originalServicePath, handlerDir));
      fs.writeFileSync(
        join(
          this.originalServicePath,
          join(handlerDir, `${func.name}-apm.js`)
        ),
        contents
      );
    });
  }
  assignHandlers() {
    const debug = createDebugger('assignHandlers');
    debug('Assigning apm handlers to sls service');
    const { handlerDir } = this.getOptions();
    this.funcs.forEach(obj => {
      _.set(
        this.sls.service.functions,
        `${obj.name}.handler`,
        posix.join(handlerDir, `${obj.name}-apm.${obj.name}`)
      );
    });
  }
  finish() {
    const debug = createDebugger('finish');
    this.log('Cleaning up extraneous apm files'); //might not need this
    debug(`Removing ${this.handlerFileName}.js`);
    const { handlerDir = 'apm_handlers' } = this.getOptions();
    fs.removeSync(join(this.originalServicePath, handlerDir));
    this.track({
      action: 'finish'
    })
      .then(_.noop)
      .catch(debug);
  }
}

module.exports = ServerlessAPMPlugin;