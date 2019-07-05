import fs from 'fs-extra';
import wrap from './wrap';
import { addTree, writeZip } from './zipTree';
import JSZip from 'jszip';

const fs = require('fs-extra');
const wrap = require('./wrap');
const { addTree, writeZip } = require('./zipTree');
const JSZip = require('jszip');

afterEach(() => jest.clearAllMocks());
jest.mock('jszip', () => ({
  loadAsync: jest.fn().mockReturnValue(
    Promise.resolve({
      file: jest.fn(),
    })
  ),
}));
jest.mock('./zipTree', () => ({
  addTree: jest.fn().mockReturnValue(Promise.resolve()),
  writeZip: jest.fn().mockReturnValue(Promise.resolve()),
}));
jest.mock('fs-extra', () => ({
  writeFileSync: jest.fn(),
  pathExistsSync: jest.fn().mockReturnValue(true),
  removeSync: jest.fn(),
  ensureDirSync: jest.fn(),
  copySync: jest.fn(),
  readFile: jest.fn().mockReturnValue(Promise.resolve('zipcontents')),
}));

describe('wrap - wrap', () => {
  it('wraps copies js sdk & calls wrapper', async () => {
    const log = jest.fn();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: jest.fn().mockReturnValue('dev') },
      sls: {
        config: { servicePath: 'path' },
        service: {
          service: 'service',
          tenant: 'tenant',
          app: 'app',
          appUid: 'appUid',
          tenantUid: 'tenantUid',
          provider: { stage: 'dev', runtime: 'nodejs8.x' },
          functions: {
            dunc: {
              runtime: 'python3.6',
              handler: 'handlerFile.handlerFunc',
            },
            func: {
              runtime: 'nodejs8.10',
              handler: 'handlerFile.handlerFunc',
            },
          },
        },
        cli: { log },
      },
    };
    await wrap(ctx);

    expect(fs.pathExistsSync).toBeCalledWith('path/serverless_sdk');
    expect(ctx.state.functions).toEqual({
      dunc: {
        entryNew: 's_dunc',
        entryOrig: 'handlerFile',
        extension: 'py',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'dunc',
        name: 'service-dev-dunc',
        timeout: 6,
        runtime: 'python3.6',
      },
      func: {
        entryNew: 's_func',
        entryOrig: 'handlerFile',
        extension: 'js',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'func',
        name: 'service-dev-func',
        timeout: 6,
        runtime: 'nodejs8.10',
      },
    });
    expect(ctx.sls.service.functions).toEqual({
      dunc: {
        runtime: 'python3.6',
        handler: 's_dunc.handler',
      },
      func: {
        runtime: 'nodejs8.10',
        handler: 's_func.handler',
      },
    });
    expect(ctx.sls.service.package).toEqual({ include: ['s_*.js', 'serverless_sdk/**'] });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toBeCalledWith(
      'path/s_func.js',
      `var serverlessSDK = require('./serverless_sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: 'tenant',
applicationName: 'app',
appUid: 'appUid',
tenantUid: 'tenantUid',
deploymentUid: 'deploymentUid',
serviceName: 'service',
stageName: 'dev'})
const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6}
try {
  const userHandler = require('./handlerFile.js')
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs)
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs)
}
`
    );
    expect(fs.writeFileSync).toBeCalledWith('path/s_dunc.py', expect.any(String));
  });

  it('wraps copies js sdk & calls wrapper when using an artifact', async () => {
    const log = jest.fn();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: jest.fn().mockReturnValue('dev') },
      sls: {
        config: { servicePath: 'path' },
        service: {
          service: 'service',
          tenant: 'tenant',
          app: 'app',
          appUid: 'appUid',
          tenantUid: 'tenantUid',
          provider: { stage: 'dev', runtime: 'nodejs8.x' },
          functions: {
            func: {
              runtime: 'nodejs8.10',
              handler: 'handlerFile.handlerFunc',
              package: { artifact: 'bundle.zip' },
            },
          },
        },
        cli: { log },
      },
    };
    await wrap(ctx);

    expect(fs.pathExistsSync).toBeCalledWith('path/serverless_sdk');
    expect(ctx.state.functions).toEqual({
      func: {
        entryNew: 's_func',
        entryOrig: 'handlerFile',
        extension: 'js',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'func',
        name: 'service-dev-func',
        timeout: 6,
        runtime: 'nodejs8.10',
      },
    });
    expect(ctx.sls.service.functions).toEqual({
      func: {
        runtime: 'nodejs8.10',
        handler: 's_func.handler',
        package: { artifact: 'bundle.zip' },
      },
    });
    expect(ctx.sls.service.package).toEqual({ include: ['s_*.js', 'serverless_sdk/**'] });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toBeCalledWith(
      'path/s_func.js',
      `var serverlessSDK = require('./serverless_sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: 'tenant',
applicationName: 'app',
appUid: 'appUid',
tenantUid: 'tenantUid',
deploymentUid: 'deploymentUid',
serviceName: 'service',
stageName: 'dev'})
const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6}
try {
  const userHandler = require('./handlerFile.js')
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs)
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs)
}
`
    );
    expect(fs.readFile).toBeCalledWith('bundle.zip');
    expect(JSZip.loadAsync).toBeCalledWith('zipcontents');
    expect(addTree).toBeCalledWith({ file: expect.any(Function) }, 'serverless_sdk');
    expect(writeZip).toBeCalledWith({ file: expect.any(Function) }, 'bundle.zip');
  });

  it('wraps copies js sdk & calls wrapper with package individually', async () => {
    const log = jest.fn();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: jest.fn().mockReturnValue('dev') },
      sls: {
        config: { servicePath: 'path' },
        service: {
          package: { individually: true },
          service: 'service',
          tenant: 'tenant',
          app: 'app',
          appUid: 'appUid',
          tenantUid: 'tenantUid',
          provider: { stage: 'dev', runtime: 'nodejs8.x' },
          functions: {
            dunc: {
              runtime: 'python3.6',
              handler: 'handlerFile.handlerFunc',
            },
            func: {
              runtime: 'nodejs8.10',
              handler: 'handlerFile.handlerFunc',
            },
          },
        },
        cli: { log },
      },
    };
    await wrap(ctx);

    expect(fs.pathExistsSync).toBeCalledWith('path/serverless_sdk');
    expect(ctx.state.functions).toEqual({
      dunc: {
        entryNew: 's_dunc',
        entryOrig: 'handlerFile',
        extension: 'py',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'dunc',
        name: 'service-dev-dunc',
        timeout: 6,
        runtime: 'python3.6',
      },
      func: {
        entryNew: 's_func',
        entryOrig: 'handlerFile',
        extension: 'js',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'func',
        name: 'service-dev-func',
        timeout: 6,
        runtime: 'nodejs8.10',
      },
    });
    expect(ctx.sls.service.functions).toEqual({
      dunc: {
        runtime: 'python3.6',
        handler: 's_dunc.handler',
        package: {
          include: ['s_dunc.py', 'serverless_sdk/**'],
        },
      },
      func: {
        runtime: 'nodejs8.10',
        handler: 's_func.handler',
        package: {
          include: ['s_func.js', 'serverless_sdk/**'],
        },
      },
    });
    expect(ctx.sls.service.package).toEqual({ individually: true });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toBeCalledWith(
      'path/s_func.js',
      `var serverlessSDK = require('./serverless_sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: 'tenant',
applicationName: 'app',
appUid: 'appUid',
tenantUid: 'tenantUid',
deploymentUid: 'deploymentUid',
serviceName: 'service',
stageName: 'dev'})
const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6}
try {
  const userHandler = require('./handlerFile.js')
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs)
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs)
}
`
    );
    /*
    expect(fs.writeFileSync).toBeCalledWith(
      'path/s_dunc.py',
      `import serverless_sdk, sys, importlib
serverlessSDK = serverlessSDK({
'tenantId': 'tenant',
'applicationName': 'app',
'appUid': 'appUid',
'tenantUid': 'tenantUid',
'deploymentUid': 'deploymentUid',
'serviceName': 'service',
'stageName': 'dev'})
handlerWrapperArgs = { 'functionName': 'service-dev-dunc', 'timeout': 6}
try:
  entry_orig = handlerFile
  handler_orig = handlerFunc
  if '/' in entry_orig:
      extra_path, module_name = entry_orig.rsplit('/')
      sys.path.append(extra_path)
      module = importlib.import_module(module_name)
      sys.path.pop()
    else:
      module = importlib.import_module(module_name)
  handler = serverlessSDK.handler(getattr(module, handler_orig), handlerWrapperArgs)
except Exception as error:
  def error_handler(event, context):
    raise error
  handler = serverlessSDK.handler(error_handler, handlerWrapperArgs)
`
    )
    */
  });
});
