'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const path = require('path');
const configUtils = require('@serverless/utils/config');
const runServerless = require('../test/run-serverless');

const platformClientPath = require.resolve('@serverless/platform-client');
const configUtilsPath = require.resolve('@serverless/utils/config');

const modulesCacheStub = {
  [configUtilsPath]: {
    ...configUtils,
    getLoggedInUser: () => ({ accessKeys: { testinteractivecli: 'access-key' } }),
  },
  [platformClientPath]: {
    ServerlessSDK: class ServerlessSDK {
      constructor() {
        this.metadata = {
          get: async () => ({ supportedRegions: ['us-east-1'] }),
        };

        this.apps = {
          get: async () => ({ appUid: 'appUid', tenantUid: 'orgUid' }),
        };

        this.logDestinations = {
          getOrCreate: async () => ({ destinationArn: 'arn:logdest' }),
        };
        this.deploymentProfiles = {
          get: () => {},
        };
      }

      async getOrgByName() {
        return { orgUid: 'foobar' };
      }

      async getProvidersByOrgServiceInstance() {
        return {};
      }
    },
  },
};

const { version } = require('../package.json');

describe('wrap - wrap', () => {
  let fs;
  let wrapUtilsFs;
  let wrapUtils;
  let wrap;
  let addTree;
  let writeZip;
  let JSZip;
  before(() => {
    fs = {
      writeFileSync: sinon.spy(),
      pathExistsSync: sinon.stub().returns(true),
      removeSync: () => {},
      ensureDirSync: () => {},
      copySync: () => {},
      readFile: sinon.stub().resolves('zipcontents'),
    };
    addTree = sinon.stub().resolves();
    writeZip = sinon.stub().resolves();
    JSZip = {
      loadAsync: sinon.stub().resolves({
        file: () => {},
      }),
    };

    wrapUtilsFs = {
      readFileSync: sinon.stub().returns('{"type": "module"}'),
      existsSync: sinon.stub().returns(true),
    };

    wrapUtils = proxyquire('./wrap-utils', {
      'fs-extra': wrapUtilsFs,
    });

    wrap = proxyquire('./wrap', {
      'jszip': JSZip,
      './zip-tree': { addTree, writeZip },
      'fs-extra': fs,
      './wrap-utils': wrapUtils,
    });
  });

  afterEach(() => sinon.resetHistory());
  it('wraps copies js sdk & calls wrapper', async () => {
    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
          provider: { stage: 'dev', runtime: 'nodejs8.x', timeout: 10 },
          functions: {
            dunc: {
              runtime: 'python3.6',
              handler: 'handlerFile.handlerFunc',
            },
            func: {
              runtime: 'nodejs8.10',
              handler: 'handlerFile.handlerFunc',
              timeout: 6,
            },
            punc: {
              runtime: 'python3.6',
              handler: 'path.to.some.handlerFunc',
              timeout: 6,
            },
            zunc: {
              runtime: 'unsupported6.66',
              handler: 'handlerFile.handlerFunc',
            },
          },
        },
      },
    };

    wrapUtilsFs.readFileSync = sinon.stub().returns('{}');
    wrapUtilsFs.existsSync = sinon.stub().returns(true);

    await wrap(ctx);

    expect(fs.pathExistsSync.calledWith(`path${path.sep}serverless_sdk`)).to.be.true;
    expect(ctx.state.functions).to.deep.equal({
      dunc: {
        entryNew: 's_dunc',
        entryOrig: 'handlerFile',
        extension: 'py',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'dunc',
        name: 'service-dev-dunc',
        timeout: 10,
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
      punc: {
        entryNew: 's_punc',
        entryOrig: 'path.to.some',
        extension: 'py',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'punc',
        name: 'service-dev-punc',
        timeout: 6,
        runtime: 'python3.6',
      },
    });
    expect(ctx.sls.service.functions).to.deep.equal({
      dunc: {
        runtime: 'python3.6',
        handler: 's_dunc.handler',
      },
      func: {
        runtime: 'nodejs8.10',
        handler: 's_func.handler',
        timeout: 6,
      },
      punc: {
        runtime: 'python3.6',
        handler: 's_punc.handler',
        timeout: 6,
      },
      zunc: {
        runtime: 'unsupported6.66',
        handler: 'handlerFile.handlerFunc',
      },
    });
    expect(ctx.sls.service.package).to.deep.equal({ patterns: ['s_*.js', 'serverless_sdk/**'] });
    expect(fs.writeFileSync.callCount).to.equal(3);
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_func.js`,
        `
var serverlessSDK = require('./serverless_sdk/index.js');
serverlessSDK = new serverlessSDK({
  orgId: 'org',
  applicationName: 'app',
  appUid: 'appUid',
  orgUid: 'orgUid',
  deploymentUid: 'deploymentUid',
  serviceName: 'service',
  shouldLogMeta: true,
  shouldCompressLogs: true,
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: false,
  accessKey: null,
  pluginVersion: '${version}',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6 };

try {
  const userHandler = require('./handlerFile.js');
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs);
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs);
}`
      )
    ).to.be.true;
    expect(fs.writeFileSync.calledWith(`path${path.sep}s_dunc.py`)).to.be.true;
  });

  it('wraps copies js sdk & calls wrapper for all supported functions when using a service artifact', async () => {
    const log = sinon.spy();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
          provider: { stage: 'dev', runtime: 'nodejs8.x' },
          package: { artifact: 'bundle.zip' },
          functions: {
            dunc: {
              runtime: 'python3.6',
              handler: 'handlerFile.handlerFunc',
            },
            func: {
              runtime: 'nodejs8.10',
              handler: 'handlerFile.handlerFunc',
              timeout: 6,
            },
            punc: {
              runtime: 'python3.6',
              handler: 'path.to.some.handlerFunc',
              timeout: 6,
            },
            zunc: {
              runtime: 'unsupported6.66',
              handler: 'handlerFile.handlerFunc',
            },
          },
        },
        cli: { log },
      },
    };
    await wrap(ctx);

    expect(fs.pathExistsSync.calledWith(`path${path.sep}serverless_sdk`)).to.be.true;
    expect(ctx.state.functions).to.deep.equal({
      dunc: {
        key: 'dunc',
        name: 'service-dev-dunc',
        runtime: 'python3.6',
        timeout: 6,
        extension: 'py',
        entryOrig: 'handlerFile',
        handlerOrig: 'handlerFunc',
        entryNew: 's_dunc',
        handlerNew: 'handler',
      },
      func: {
        key: 'func',
        name: 'service-dev-func',
        runtime: 'nodejs8.10',
        timeout: 6,
        extension: 'js',
        entryOrig: 'handlerFile',
        handlerOrig: 'handlerFunc',
        entryNew: 's_func',
        handlerNew: 'handler',
      },
      punc: {
        key: 'punc',
        name: 'service-dev-punc',
        runtime: 'python3.6',
        timeout: 6,
        extension: 'py',
        entryOrig: 'path.to.some',
        handlerOrig: 'handlerFunc',
        entryNew: 's_punc',
        handlerNew: 'handler',
      },
    });
    expect(ctx.sls.service.package).to.deep.equal({ artifact: 'bundle.zip' });
    expect(fs.writeFileSync.callCount).to.equal(3);
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_func.js`,
        `
var serverlessSDK = require('./serverless_sdk/index.js');
serverlessSDK = new serverlessSDK({
  orgId: 'org',
  applicationName: 'app',
  appUid: 'appUid',
  orgUid: 'orgUid',
  deploymentUid: 'deploymentUid',
  serviceName: 'service',
  shouldLogMeta: true,
  shouldCompressLogs: true,
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: false,
  accessKey: null,
  pluginVersion: '${version}',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6 };

try {
  const userHandler = require('./handlerFile.js');
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs);
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs);
}`
      )
    ).to.be.true;
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_dunc.py`,
        `import serverless_sdk
sdk = serverless_sdk.SDK(
    org_id='org',
    application_name='app',
    app_uid='appUid',
    org_uid='orgUid',
    deployment_uid='deploymentUid',
    service_name='service',
    should_log_meta=True,
    should_compress_logs=True,
    disable_aws_spans=False,
    disable_http_spans=False,
    stage_name='dev',
    plugin_version='${version}',
    disable_frameworks_instrumentation=False,
    serverless_platform_stage='prod'
)
handler_wrapper_kwargs = {'function_name': 'service-dev-dunc', 'timeout': 6}
try:
    user_handler = serverless_sdk.get_user_handler('handlerFile.handlerFunc')
    handler = sdk.handler(user_handler, **handler_wrapper_kwargs)
except Exception as error:
    e = error
    def error_handler(event, context):
        raise e
    handler = sdk.handler(error_handler, **handler_wrapper_kwargs)
`
      )
    ).to.be.true;
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_punc.py`,
        `import serverless_sdk
sdk = serverless_sdk.SDK(
    org_id='org',
    application_name='app',
    app_uid='appUid',
    org_uid='orgUid',
    deployment_uid='deploymentUid',
    service_name='service',
    should_log_meta=True,
    should_compress_logs=True,
    disable_aws_spans=False,
    disable_http_spans=False,
    stage_name='dev',
    plugin_version='${version}',
    disable_frameworks_instrumentation=False,
    serverless_platform_stage='prod'
)
handler_wrapper_kwargs = {'function_name': 'service-dev-punc', 'timeout': 6}
try:
    user_handler = serverless_sdk.get_user_handler('path.to.some.handlerFunc')
    handler = sdk.handler(user_handler, **handler_wrapper_kwargs)
except Exception as error:
    e = error
    def error_handler(event, context):
        raise e
    handler = sdk.handler(error_handler, **handler_wrapper_kwargs)
`
      )
    ).to.be.true;
    expect(fs.readFile.calledWith('bundle.zip')).to.be.true;
    expect(JSZip.loadAsync.calledWith('zipcontents')).to.be.true;
    expect(addTree.args[0][1]).to.equal('serverless_sdk');
    expect(writeZip.args[0][1]).to.equal('bundle.zip');
  });

  it('wraps copies js sdk & calls wrapper when using a function artifact with package individually', async () => {
    const log = sinon.spy();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
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

    expect(fs.pathExistsSync.calledWith(`path${path.sep}serverless_sdk`)).to.be.true;
    expect(ctx.state.functions).to.deep.equal({
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
    expect(ctx.sls.service.functions).to.deep.equal({
      func: {
        runtime: 'nodejs8.10',
        handler: 's_func.handler',
        package: { artifact: 'bundle.zip' },
      },
    });
    expect(ctx.sls.service.package).to.deep.equal({ patterns: ['s_*.js', 'serverless_sdk/**'] });
    expect(fs.writeFileSync.callCount).to.equal(1);
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_func.js`,
        `
var serverlessSDK = require('./serverless_sdk/index.js');
serverlessSDK = new serverlessSDK({
  orgId: 'org',
  applicationName: 'app',
  appUid: 'appUid',
  orgUid: 'orgUid',
  deploymentUid: 'deploymentUid',
  serviceName: 'service',
  shouldLogMeta: true,
  shouldCompressLogs: true,
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: false,
  accessKey: null,
  pluginVersion: '${version}',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6 };

try {
  const userHandler = require('./handlerFile.js');
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs);
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs);
}`
      )
    ).to.be.true;
    expect(fs.readFile.calledWith('bundle.zip')).to.be.true;
    expect(JSZip.loadAsync.calledWith('zipcontents')).to.be.true;
    expect(addTree.args[0][1]).to.equal('serverless_sdk');
    expect(writeZip.args[0][1]).to.equal('bundle.zip');
  });

  it('wraps copies js sdk & calls wrapper with package individually', async () => {
    const log = sinon.spy();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          package: { individually: true },
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
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

    expect(fs.pathExistsSync.calledWith(`path${path.sep}serverless_sdk`)).to.be.true;
    expect(ctx.state.functions).to.deep.equal({
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
    expect(ctx.sls.service.functions).to.deep.equal({
      dunc: {
        runtime: 'python3.6',
        handler: 's_dunc.handler',
        package: {
          patterns: ['s_dunc.py', 'serverless_sdk/**'],
        },
      },
      func: {
        runtime: 'nodejs8.10',
        handler: 's_func.handler',
        package: {
          patterns: ['s_func.js', 'serverless_sdk/**'],
        },
      },
    });
    expect(ctx.sls.service.package).to.deep.equal({ individually: true });
    expect(fs.writeFileSync.callCount).to.equal(2);
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_func.js`,
        `
var serverlessSDK = require('./serverless_sdk/index.js');
serverlessSDK = new serverlessSDK({
  orgId: 'org',
  applicationName: 'app',
  appUid: 'appUid',
  orgUid: 'orgUid',
  deploymentUid: 'deploymentUid',
  serviceName: 'service',
  shouldLogMeta: true,
  shouldCompressLogs: true,
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: false,
  accessKey: null,
  pluginVersion: '${version}',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6 };

try {
  const userHandler = require('./handlerFile.js');
  module.exports.handler = serverlessSDK.handler(userHandler.handlerFunc, handlerWrapperArgs);
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs);
}`
      )
    ).to.be.true;
    expect(
      fs.writeFileSync.calledWith(
        `path${path.sep}s_dunc.py`,
        `import serverless_sdk
sdk = serverless_sdk.SDK(
    org_id='org',
    application_name='app',
    app_uid='appUid',
    org_uid='orgUid',
    deployment_uid='deploymentUid',
    service_name='service',
    should_log_meta=True,
    should_compress_logs=True,
    disable_aws_spans=False,
    disable_http_spans=False,
    stage_name='dev',
    plugin_version='${version}',
    disable_frameworks_instrumentation=False,
    serverless_platform_stage='prod'
)
handler_wrapper_kwargs = {'function_name': 'service-dev-dunc', 'timeout': 6}
try:
    user_handler = serverless_sdk.get_user_handler('handlerFile.handlerFunc')
    handler = sdk.handler(user_handler, **handler_wrapper_kwargs)
except Exception as error:
    e = error
    def error_handler(event, context):
        raise e
    handler = sdk.handler(error_handler, **handler_wrapper_kwargs)
`
      )
    ).to.be.true;
  });

  it('does not wrap service when custom.enterprise.disableWrapping is true', async () => {
    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
          provider: { stage: 'dev', runtime: 'nodejs18.x', timeout: 10 },
          custom: {
            enterprise: {
              disableWrapping: true,
            },
          },
          functions: {
            func: {
              runtime: 'nodejs18.x',
              handler: 'handlerFile.handlerFunc',
              timeout: 6,
            },
          },
        },
      },
    };
    await wrap(ctx);
    expect(ctx.state.functions).to.be.undefined;
    expect(Object.keys(ctx.state).length).to.equal(0);
  });

  it('does not wrap service when package.json type is module is true', async () => {
    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
          provider: { stage: 'dev', runtime: 'nodejs18.x', timeout: 10 },
          functions: {
            func: {
              runtime: 'nodejs18.x',
              handler: 'handlerFile.handlerFunc',
              timeout: 6,
            },
          },
        },
      },
    };

    wrapUtilsFs.readFileSync = sinon.stub().returns('{"type": "module"}');

    await wrap(ctx);
    expect(ctx.state.functions).to.be.undefined;
    expect(Object.keys(ctx.state).length).to.equal(0);
  });

  it('wraps cjs functions and does not wrap mjs functions', async () => {
    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
          provider: { stage: 'dev', runtime: 'nodejs18.x', timeout: 10 },
          functions: {
            cjsFunc: {
              runtime: 'nodejs18.x',
              handler: 'handlerFile.handlerFunc',
              timeout: 6,
            },
            mjsFunc: {
              runtime: 'nodejs18.x',
              handler: 'handlerFile.handlerFuncMjc',
              timeout: 6,
            },
          },
        },
      },
    };

    wrapUtilsFs.existsSync = sinon
      .stub()
      .onCall(0)
      .returns(false)
      .onCall(1)
      .returns(true)
      .onCall(2)
      .returns(false)
      .onCall(3)
      .returns(true);
    await wrap(ctx);
    expect(ctx.state.functions).to.not.be.undefined;
    expect(Object.keys(ctx.state.functions)).to.deep.equal(['cjsFunc']);
  });

  it('does not wrap unsupported python versions', async () => {
    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
        processedInput: { commands: [] },
        service: {
          service: 'service',
          org: 'org',
          app: 'app',
          appUid: 'appUid',
          orgUid: 'orgUid',
          provider: { stage: 'dev', runtime: 'nodejs18.x', timeout: 10 },
          functions: {
            cjsFunc: {
              runtime: 'nodejs18.x',
              handler: 'handlerFile.handlerFunc',
              timeout: 6,
            },
            python11Func: {
              runtime: 'python3.11',
              handler: 'handlerFile.python311',
              timeout: 6,
            },
          },
        },
      },
    };

    wrapUtilsFs.existsSync = sinon.stub().onCall(0).returns(false).onCall(1).returns(true);
    await wrap(ctx);
    expect(ctx.state.functions).to.not.be.undefined;
    expect(Object.keys(ctx.state.functions)).to.deep.equal(['cjsFunc']);
  });

  describe('dev mode', () => {
    const overrideEnv = require('process-utils/override-env');
    let restoreEnv;

    before(() => {
      ({ restoreEnv } = overrideEnv({ asCopy: true, variables: { SLS_DEV_MODE: '1' } }));

      // require here to allow use of the new environment var
      wrap = proxyquire('./wrap', {
        'jszip': JSZip,
        './zip-tree': { addTree, writeZip },
        'fs-extra': fs,
        './client-utils': {
          getOrCreateAccessKeyForOrg: () => 'accesskey',
        },
      });
    });

    after(() => {
      restoreEnv();
    });

    it('wraps js with sdk & dev mode preamble if dev mode enabled', async () => {
      const log = sinon.spy();

      const ctx = {
        deploymentUid: 'deploymentUid',
        state: {},
        provider: { getStage: () => 'dev' },
        sls: {
          config: { servicePath: 'path' },
          processedInput: { commands: [] },
          service: {
            service: 'service',
            org: 'org',
            app: 'app',
            appUid: 'appUid',
            orgUid: 'orgUid',
            provider: { stage: 'dev', runtime: 'nodejs8.x', timeout: 10 },
            functions: {
              func: {
                runtime: 'nodejs8.10',
                handler: 'handlerFile.handlerFunc',
                timeout: 6,
              },
            },
          },
          cli: { log },
        },
      };
      await wrap(ctx);
      expect(fs.writeFileSync.args[0][1]).to.include('studioHandler');
    });
  });
});

describe('wrap #2', () => {
  it('Should not log meta log on local invocation', async () => {
    const { output } = await runServerless({
      fixture: 'function',
      command: 'invoke local',
      configExt: {
        custom: {
          enterprise: {
            disableAwsSpans: true,
            disableHttpSpans: true,
            disableFrameworksInstrumentation: true,
          },
        },
      },
      options: { function: 'function' },
      modulesCacheStub,
    });
    expect(output).to.not.include('SERVERLESS_ENTERPRISE');
  });
  it('Should handle functions that reference images', async () => {
    await runServerless({
      fixture: 'function',
      configExt: {
        functions: {
          function: {
            handler: null,
            image:
              '000000000000.dkr.ecr.sa-east-1.amazonaws.com/test-lambda-docker@sha256:6bb600b4d6e1d7cf521097177dd0c4e9ea373edb91984a505333be8ac9455d38',
          },
        },
      },
      command: 'package',
      modulesCacheStub,
      awsRequestStubMap: {
        STS: {
          getCallerIdentity: {
            ResponseMetadata: { RequestId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
            UserId: 'XXXXXXXXXXXXXXXXXXXXX',
            Account: '999999999999',
            Arn: 'arn:aws:iam::999999999999:user/test',
          },
        },
      },
    });
  });

  it('Should resolve default runtime', async () => {
    const {
      cfTemplate: { Resources: cfResources },
    } = await runServerless({
      fixture: 'function',
      configExt: {
        disabledDeprecations: ['CHANGE_OF_DEFAULT_RUNTIME_TO_NODEJS14X'],
        provider: { runtime: null },
      },
      command: 'package',
      modulesCacheStub,
      awsRequestStubMap: {
        STS: {
          getCallerIdentity: {
            ResponseMetadata: { RequestId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
            UserId: 'XXXXXXXXXXXXXXXXXXXXX',
            Account: '999999999999',
            Arn: 'arn:aws:iam::999999999999:user/test',
          },
        },
      },
    });
    expect(cfResources.FunctionLambdaFunction.Properties.Handler).to.equal('s_function.handler');
  });
});
