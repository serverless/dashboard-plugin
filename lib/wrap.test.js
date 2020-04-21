'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const chalk = require('chalk');

const { version } = require('../package.json');

describe('wrap - wrap', () => {
  let fs;
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

    wrap = proxyquire('./wrap', {
      'jszip': JSZip,
      './zipTree': { addTree, writeZip },
      'fs-extra': fs,
    });
  });

  afterEach(() => sinon.resetHistory());
  it('wraps copies js sdk & calls wrapper', async () => {
    const log = sinon.spy();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
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
        cli: { log },
      },
    };
    await wrap(ctx);

    expect(fs.pathExistsSync.calledWith('path/serverless_sdk')).to.be.true;
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
    expect(ctx.sls.service.package).to.deep.equal({ include: ['s_*.js', 'serverless_sdk/**'] });
    expect(
      ctx.sls.cli.log.calledWith(
        chalk.keyword('orange')(
          "Warning the Serverless Dashboard doesn't support the following runtime: unsupported6.66"
        )
      )
    ).to.be.true;
    expect(fs.writeFileSync.callCount).to.equal(3);
    expect(
      fs.writeFileSync.calledWith(
        'path/s_func.js',
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
    expect(fs.writeFileSync.calledWith('path/s_dunc.py')).to.be.true;
  });

  it('wraps copies js sdk & calls wrapper when using an artifact', async () => {
    const log = sinon.spy();

    const ctx = {
      deploymentUid: 'deploymentUid',
      state: {},
      provider: { getStage: () => 'dev' },
      sls: {
        config: { servicePath: 'path' },
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

    expect(fs.pathExistsSync.calledWith('path/serverless_sdk')).to.be.true;
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
    expect(ctx.sls.service.package).to.deep.equal({ include: ['s_*.js', 'serverless_sdk/**'] });
    expect(fs.writeFileSync.callCount).to.equal(1);
    expect(
      fs.writeFileSync.calledWith(
        'path/s_func.js',
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

    expect(fs.pathExistsSync.calledWith('path/serverless_sdk')).to.be.true;
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
    expect(ctx.sls.service.package).to.deep.equal({ individually: true });
    expect(fs.writeFileSync.callCount).to.equal(2);
    expect(
      fs.writeFileSync.calledWith(
        'path/s_func.js',
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
        'path/s_dunc.py',
        `import serverless_sdk
sdk = serverless_sdk.SDK(
    org_id='org',
    application_name='app',
    app_uid='appUid',
    org_uid='orgUid',
    deployment_uid='deploymentUid',
    service_name='service',
    should_log_meta=True,
    disable_aws_spans=False,
    disable_http_spans=False,
    stage_name='dev',
    plugin_version='${version}',
    disable_frameworks_instrumentation=False
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

  describe('dev mode', () => {
    const overrideEnv = require('process-utils/override-env');
    let restoreEnv;

    before(() => {
      ({ restoreEnv } = overrideEnv({ asCopy: true, variables: { SLS_DEV_MODE: '1' } }));

      const platformSdk = {
        getAccessKeyForTenant: sinon.stub(),
      };

      // require here to allow use of the new environment var
      wrap = proxyquire('./wrap', {
        'jszip': JSZip,
        './zipTree': { addTree, writeZip },
        'fs-extra': fs,
        '@serverless/platform-sdk': platformSdk,
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
      expect(
        fs.writeFileSync.calledWith(
          'path/s_func.js',
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
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: true,
  accessKey: 'undefined',
  pluginVersion: '${version}',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'service-dev-func', timeout: 6 };

require('aws-sdk');
const studioHandler = (event, context, callback) => {
  console.log('Starting serverless Studio');
  return new Promise((resolve, reject) => {

    // handle callback resolutions since we always return a promise
    let finalized = false;
    const finalize = (error, result) => {
      if (finalized) { return; }
      finalized = true;
      serverlessSDK
        .publishSync({
          event: "studio.invocationInfo",
          data: {
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
            requestId: context.awsRequestId,
            response: result,
            error: error
          }
        })
        .then(() => {})
        .catch(() => {})
        .finally(() => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });      
    }

    // Patch context methods
    const contextProxy = new Proxy(context, {
      get: (target, prop) => {
        if (prop === 'done') {
          return (err, res) => {
            target.done(err, res);
            finalize(err, res)
          };
        } else if (prop === 'succeed') {
          return res => {
            target.succeed(res);
            finalize(null, res);
          };
        } else if (prop === 'fail') {
          return err => {
            target.fail(err);
            finalize(err, null);
          };
        }
        return target[prop];
      },
    });

    // Start dev mode
    serverlessSDK
      .startDevMode(context)
      .then(() => {
        console.log('Function connected to Studio websocket');
        try {
          serverlessSDK.publish({
            event: "studio.invocationInfo",
            data: {
              functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
              requestId: context.awsRequestId,
              event
            }
          });
        } catch (err) {
          console.log('Unable to send invocation data to Studio', err)
        }
        try {
          const userHandler = require('./handlerFile.js');   
          const result = userHandler.handlerFunc(event, contextProxy, finalize);        
          // if a promise was returned, we need to return the resolved promise
          if (result && typeof result.then === 'function') {
            result
              .then((res) => { finalize(null, res) })
              .catch((err) => { finalize(err, null) });
          } else {
            // Gulp... nothing returned here, wait for callback or context returns
          }
        } catch (error) {
          console.log('Error invoking wrapped function', error);
          finalize(error, null);
        } finally {
          serverlessSDK.stopDevMode();
          console.log('Function disconnected from Studio websocket');
        }
      })
      .catch((error) => {
        console.error('Unable to start Studio mode', error);
        reject(error);
      });  
  });
};
module.exports.handler = serverlessSDK.handler(studioHandler, handlerWrapperArgs);`
        )
      ).to.be.true;
    });
  });
});
