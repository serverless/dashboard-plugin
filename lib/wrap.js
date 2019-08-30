'use strict';

/*
 * Wrap
 * - Bundles the ServerlessSDK into your functions
 * - Wraps your function handlers with the ServerlessSDK
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const JSZip = require('jszip');
const { addTree, writeZip } = require('./zipTree');
const { version } = require('../package.json');

const deprecatedNodes = ['nodejs', 'nodejs4.3', 'nodejs4.3-edge'];
const supportedNodeRuntime = runtime =>
  runtime && runtime.includes('nodejs') && !deprecatedNodes.includes(runtime);
const supportedPythonRuntime = runtime => runtime && runtime.includes('python');
const supportedRuntime = runtime =>
  supportedNodeRuntime(runtime) || supportedPythonRuntime(runtime);

/*
 * Wrap Node.js Functions
 */
const wrapNodeJs = (fn, ctx) => {
  const newHandlerCode = `var serverlessSDK = require('./serverless_sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: '${ctx.sls.service.tenant}',
applicationName: '${ctx.sls.service.app}',
appUid: '${ctx.sls.service.appUid}',
tenantUid: '${ctx.sls.service.tenantUid}',
deploymentUid: '${ctx.deploymentUid}',
serviceName: '${ctx.sls.service.service}',
stageName: '${ctx.provider.getStage()}',
pluginVersion: '${version}'})
const handlerWrapperArgs = { functionName: '${fn.name}', timeout: ${fn.timeout}}
try {
  const userHandler = require('./${fn.entryOrig}.js')
  module.exports.handler = serverlessSDK.handler(userHandler.${fn.handlerOrig}, handlerWrapperArgs)
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs)
}
`;

  // Create new handlers
  fs.writeFileSync(path.join(ctx.sls.config.servicePath, `${fn.entryNew}.js`), newHandlerCode);
};

/*
 * Wrap python Functions
 */
const wrapPython = (fn, ctx) => {
  const newHandlerCode = `import serverless_sdk
sdk = serverless_sdk.SDK(
    tenant_id='${ctx.sls.service.tenant}',
    application_name='${ctx.sls.service.app}',
    app_uid='${ctx.sls.service.appUid}',
    tenant_uid='${ctx.sls.service.tenantUid}',
    deployment_uid='${ctx.deploymentUid}',
    service_name='${ctx.sls.service.service}',
    stage_name='${ctx.provider.getStage()}',
    plugin_version='${version}'
)
handler_wrapper_kwargs = {'function_name': '${fn.name}', 'timeout': ${fn.timeout}}
try:
    user_handler = serverless_sdk.get_user_handler('${fn.entryOrig}.${fn.handlerOrig}')
    handler = sdk.handler(user_handler, **handler_wrapper_kwargs)
except Exception as error:
    e = error
    def error_handler(event, context):
        raise e
    handler = sdk.handler(error_handler, **handler_wrapper_kwargs)
`;

  // Create new handlers
  fs.writeFileSync(path.join(ctx.sls.config.servicePath, `${fn.entryNew}.py`), newHandlerCode);
};

const wrap = async ctx => {
  // Check if we support the provider
  if (ctx.sls.service.provider.name !== 'aws') {
    ctx.sls.cli.log(
      chalk.keyword('orange')(
        'Warning: The Serverless Dashboard does not currently support this provider.'
      )
    );
  }

  /*
   * Prepare Functions
   */
  const { functions } = ctx.sls.service;
  ctx.state.functions = {};
  const unsupportedRuntimes = new Set();
  for (const func of Object.keys(functions)) {
    const runtime = functions[func].runtime
      ? functions[func].runtime
      : ctx.sls.service.provider.runtime;
    if (!supportedRuntime(runtime)) {
      unsupportedRuntimes.add(runtime);
      continue;
    }

    // the default is 6s: https://serverless.com/framework/docs/providers/aws/guide/serverless.yml/
    const timeout = functions[func].timeout ? functions[func].timeout : 6;

    // Process name
    let name;
    if (functions[func].name) {
      ({ name } = functions[func]);
    } else {
      name = `${ctx.sls.service.service}-${ctx.sls.service.provider.stage}-${func}`;
    }

    // Process handler
    const entry = functions[func].handler
      .split('.')
      .slice(0, -1)
      .join('.');
    const handler = functions[func].handler.split('.').slice(-1)[0];
    let extension = 'js';
    if (runtime.includes('python')) {
      extension = 'py';
    }

    ctx.state.functions[func] = {
      key: func,
      name,
      runtime,
      timeout,
      extension,
      entryOrig: entry,
      handlerOrig: handler,
      entryNew: `s_${func.replace(/-/g, '_')}`,
      handlerNew: 'handler',
    };
  }
  if (unsupportedRuntimes.size) {
    ctx.sls.cli.log(
      chalk.keyword('orange')(
        `Warning the Serverless Dashboard doesn't support the following runtime${
          unsupportedRuntimes.size === 1 ? '' : 's'
        }: ${Array.from(unsupportedRuntimes).join(', ')}`
      )
    );
  }

  /*
   * Wrap Functions
   */

  ctx.state.pathAssets = path.join(ctx.sls.config.servicePath, 'serverless_sdk');

  // Clear existing handler dir
  if (fs.pathExistsSync(ctx.state.pathAssets)) {
    fs.removeSync(ctx.state.pathAssets);
  }

  // Create new handler dir
  fs.ensureDirSync(ctx.state.pathAssets);

  // Copy SDK
  const vals = Object.keys(ctx.state.functions).map(key => ctx.state.functions[key]);
  if (vals.some(({ runtime }) => supportedNodeRuntime(runtime))) {
    const pathSdk = path.resolve(__dirname, '../sdk-js/dist/index.js');
    const pathSdkDest = path.join(ctx.state.pathAssets, './index.js');
    fs.copySync(pathSdk, pathSdkDest);
  }
  if (vals.some(({ runtime }) => supportedPythonRuntime(runtime))) {
    const pathSdk = path.resolve(__dirname, '../sdk-py/serverless_sdk.py');
    const pathSdkDest = path.join(ctx.state.pathAssets, './__init__.py');
    fs.copySync(pathSdk, pathSdkDest);
  }

  // Prepare & Copy Function Handlers
  for (const fn of Object.keys(ctx.state.functions)) {
    const func = ctx.state.functions[fn];

    if (!supportedRuntime(func.runtime)) {
      continue;
    }

    // Add the Serverless SDK wrapper around the function

    if (supportedNodeRuntime(func.runtime)) {
      wrapNodeJs(func, ctx);
    } else if (supportedPythonRuntime(func.runtime)) {
      wrapPython(func, ctx);
    }

    // Re-assign the handler to point to the wrapper
    ctx.sls.service.functions[fn].handler = `${func.entryNew}.${func.handlerNew}`;

    if (_.get(ctx.sls.service.functions[fn], 'package.artifact')) {
      const zipData = await fs.readFile(ctx.sls.service.functions[fn].package.artifact);
      const zip = await JSZip.loadAsync(zipData);
      const wrapperData = await fs.readFile(
        path.join(ctx.sls.config.servicePath, `${func.entryNew}.${func.extension}`)
      );
      zip.file(`${func.entryNew}.${func.extension}`, wrapperData);
      await addTree(zip, 'serverless_sdk');
      await writeZip(zip, ctx.sls.service.functions[fn].package.artifact);
    } else if (
      _.get(
        ctx.sls.service.functions[fn],
        'package.individually',
        _.get(ctx.sls.service, 'package.individually', false)
      )
    ) {
      // add include directives for handler file & sdk lib
      if (ctx.sls.service.functions[fn].package === undefined) {
        ctx.sls.service.functions[fn].package = {};
      }
      if (ctx.sls.service.functions[fn].package.include === undefined) {
        ctx.sls.service.functions[fn].package.include = [];
      }
      ctx.sls.service.functions[fn].package.include.push(`${func.entryNew}.${func.extension}`);
      ctx.sls.service.functions[fn].package.include.push('serverless_sdk/**');
    }
  }

  // add include directives for handler file & sdk lib
  if (!_.get(ctx.sls.service, 'package.individually', false)) {
    let extension = 'js';
    if (supportedPythonRuntime(ctx.sls.service.provider.runtime)) {
      extension = 'py';
    }
    if (ctx.sls.service.package === undefined) {
      ctx.sls.service.package = {};
    }
    if (ctx.sls.service.package.include === undefined) {
      ctx.sls.service.package.include = [];
    }
    ctx.sls.service.package.include.push(`s_*.${extension}`);
    ctx.sls.service.package.include.push('serverless_sdk/**');
  }
};

module.exports = wrap;
