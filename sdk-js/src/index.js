'use strict';

/*
 * Spans and Monkey Patching
 */
const EventEmitter = require('events');
const isThenable = require('type/thenable/is');

const spanEmitter = new EventEmitter();

/*
 * Serverless SDK
 */

const os = require('os');
const ServerlessTransaction = require('./lib/transaction.js');
const detectEventType = require('./lib/eventDetection');

let currentAwsCallback;

/*
 * Serverless SDK Class
 */
class ServerlessSDK {
  /*
   * Constructor
   */

  constructor(obj) {
    this.$ = {};
    this.$.config = {};
    this.$.config.debug = obj.config ? obj.config.debug || false : false;

    this.$.orgId = obj.orgId || null;
    this.$.appUid = obj.appUid || null;
    this.$.orgUid = obj.orgUid || null;
    this.$.deploymentUid = obj.deploymentUid || null;
    this.$.applicationName = obj.applicationName || null;
    this.$.serviceName = obj.serviceName || null;
    this.$.stageName = obj.stageName || null;
    this.$.pluginVersion = obj.pluginVersion || null;
    this.$.devModeEnabled = obj.devModeEnabled || false;
    this.$.serverlessPlatformStage = obj.serverlessPlatformStage || 'prod';
    this.$.accessKey = obj.accessKey;

    this.shouldLogMeta = obj.shouldLogMeta;
    this.shouldCompressLogs = obj.shouldCompressLogs;

    /*
     * Monkey patch spans using config
     */
    if (process.env.SERVERLESS_ENTERPRISE_SPANS_CAPTURE_AWS_SDK_HTTP) {
      console.warn(
        'The environment variable SERVERLESS_ENTERPRISE_SPANS_CAPTURE_AWS_SDK_HTTP is deprecated and will be removed in the future. ' +
          'To disable HTTP span collection, in your serverless.yml file add this key: custom.enterprise.disableHttpSpans: true'
      );
    }
    if (!obj.disableAwsSpans) require('./lib/spanHooks/hookAwsSdk')(spanEmitter);
    if (!obj.disableHttpSpans) require('./lib/spanHooks/hookHttp')(spanEmitter);
    if (!obj.disableFrameworksInstrumentation) {
      require('./lib/frameworks')(ServerlessSDK, this.$.config);
    }
  }

  /**
   * Start capturing log output
   */
  async startDevMode(event, awsContext) {
    if (this.$.devModeEnabled) {
      const { ServerlessSDK: PlatformSDK } = require('@serverless/platform-client');

      this.platformV2SDK = new PlatformSDK({
        platformStage: this.$.serverlessPlatformStage,
        accessKey: this.$.accessKey,
        context: awsContext
          ? {
              awsLambda: {
                functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                awsRequestId: awsContext.awsRequestId,
                invokeId: awsContext.invokeId,
                transactionId: event.requestContext ? event.requestContext.requestId : null,
              },
            }
          : null,
      });

      await this.platformV2SDK.connect({
        orgName: this.$.orgId,
      });

      this.platformV2SDK.startInterceptingLogs('service.logs', {
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        awsRequestId: awsContext.awsRequestId,
        invokeId: awsContext.invokeId,
        transactionId: event.requestContext ? event.requestContext.requestId : null,
      });
    }
  }

  /**
   * Stop capturing log output
   */
  stopDevMode() {
    if (this.$.devModeEnabled && this.platformV2SDK.isConnected()) {
      this.platformV2SDK.stopInterceptingLogs();
      this.platformV2SDK.disconnect();
    }
  }

  /**
   * Publish dev mode event asynchronously
   */
  publish(event) {
    if (this.$.devModeEnabled && this.platformV2SDK.isConnected()) {
      this.platformV2SDK.events.publish(event);
    }
  }

  /**
   * Publish dev mode event asynchronously
   */
  async publishSync(event) {
    if (this.$.devModeEnabled && this.platformV2SDK.isConnected()) {
      return this.platformV2SDK.events.publish(event);
    }
    return null;
  }

  /*
   * Transaction
   * - Creates a new transaction
   */

  transaction(data) {
    return new ServerlessTransaction(data);
  }

  /*
   * Handler
   * - TODO: Perhaps accept config OR function (config is better because it captures load errors)
   */

  handler(fn, config) {
    const self = this;
    const meta = {};
    config = config || {};

    if (self.$.config.debug) {
      console.info(
        `ServerlessSDK: Handler: Loading function handler with these inputs: ${os.EOL}${fn}${os.EOL}${config}...`
      );
    }

    // Enforce required config
    let missing;
    if (!config.functionName) {
      missing = 'functionName';
    }
    if (missing) {
      throw new Error(`ServerlessSDK: Handler requires a ${missing} property in a config object`);
    }

    // Add global defaults
    // WARNING: This data is accessed in function handlers.  Therefore, DON'T add values that are request-specific.
    // WARNING: This will result in data from prevous requests affecting the current request
    meta.orgId = this.$.orgId || null;
    meta.applicationName = this.$.applicationName || null;
    meta.appUid = this.$.appUid || null;
    meta.orgUid = this.$.orgUid || null;
    meta.deploymentUid = this.$.deploymentUid || null;
    meta.serviceName = this.$.serviceName || null;
    meta.stageName = this.$.stageName || null;
    meta.pluginVersion = this.$.pluginVersion || null;
    meta.functionName = config.functionName;
    meta.timeout = config.timeout || 6;
    meta.computeType = config.computeType || null;

    /*
     * Auto-Detect: Compute Type
     */

    if (!meta.computeType) {
      // AWS Lambda
      if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        meta.computeType = 'aws.lambda';
      }
    }

    /*
     * Wrapper: AWS Lambda
     */

    if (meta.computeType === 'aws.lambda') {
      if (self.$.config.debug) {
        console.info('ServerlessSDK: Handler: Loading AWS Lambda handler...');
      }

      return (event, context, callback) => {
        currentAwsCallback = callback;
        if (self.$.config.debug) {
          console.info(
            `ServerlessSDK: Handler: AWS Lambda wrapped handler executed with these values ${event} ${context} ${callback}...`
          );
        }

        // Defaults
        event = event || {};
        context = context || {};
        const eventType = detectEventType(event);

        /*
         * Auto-Detect: Event Type
         */

        // Start transaction
        const trans = self.transaction({
          orgId: meta.orgId,
          applicationName: meta.applicationName,
          appUid: meta.appUid,
          orgUid: meta.orgUid,
          deploymentUid: meta.deploymentUid,
          serviceName: meta.serviceName,
          pluginVersion: meta.pluginVersion,
          stageName: meta.stageName,
          functionName: meta.functionName,
          timeout: meta.timeout,
          computeType: meta.computeType,
          shouldLogMeta: this.shouldLogMeta,
          shouldCompressLogs: this.shouldCompressLogs,
          eventType,
        });

        const timeoutHandler = setTimeout(() => {
          if (callback === currentAwsCallback) trans.report();
        }, context.getRemainingTimeInMillis() - 50).unref();

        // Capture Compute Data: aws.lambda
        trans.set('compute.runtime', `aws.lambda.nodejs.${process.versions.node}`);
        trans.set('compute.region', process.env.AWS_REGION);
        trans.set('compute.memorySize', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE);
        trans.set('compute.custom.functionName', process.env.AWS_LAMBDA_FUNCTION_NAME);
        trans.set('compute.custom.functionVersion', process.env.AWS_LAMBDA_FUNCTION_VERSION);
        trans.set('compute.custom.arn', context.invokedFunctionArn);
        trans.set('compute.custom.region', process.env.AWS_REGION);
        trans.set('compute.custom.memorySize', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE);
        trans.set('compute.custom.invokeId', context.invokeId);
        trans.set('compute.custom.awsRequestId', context.awsRequestId);
        trans.set('compute.custom.xTraceId', process.env._X_AMZN_TRACE_ID);
        trans.set('compute.custom.logGroupName', process.env.AWS_LAMBDA_LOG_GROUP_NAME);
        trans.set('compute.custom.logStreamName', process.env.AWS_LAMBDA_LOG_STREAM_NAME);
        trans.set('compute.custom.envPlatform', process.platform);
        trans.set('compute.custom.envArch', process.arch);
        trans.set('compute.custom.envMemoryTotal', os.totalmem());
        trans.set('compute.custom.envMemoryFree', os.freemem());
        trans.set('compute.custom.envCpus', JSON.stringify(os.cpus()));

        // Capture Event Data: aws.apigateway.http
        if (eventType === 'aws.apigateway.http') {
          const timestamp = event.requestContext.requestTimeEpoch || Date.now().valueOf(); // local testing does not contain a requestTimeEpoc
          trans.set('event.timestamp', new Date(timestamp).toISOString());
          trans.set('event.source', 'aws.apigateway');
          trans.set('event.custom.accountId', event.requestContext.accountId);
          trans.set('event.custom.apiId', event.requestContext.apiId);
          trans.set('event.custom.resourceId', event.requestContext.resourceId);
          trans.set('event.custom.domainPrefix', event.requestContext.domainPrefix);
          trans.set('event.custom.domain', event.requestContext.domainName);
          trans.set('event.custom.requestId', event.requestContext.requestId);
          trans.set('event.custom.extendedRequestId', event.requestContext.extendedRequestId);
          trans.set('event.custom.requestTime', event.requestContext.requestTime);
          trans.set('event.custom.requestTimeEpoch', event.requestContext.requestTimeEpoch);
          trans.set('event.custom.httpPath', event.requestContext.resourcePath);
          trans.set('event.custom.httpMethod', event.requestContext.httpMethod);
          trans.set('event.custom.xTraceId', event.headers && event.headers['X-Amzn-Trace-Id']);
          trans.set('event.custom.userAgent', event.headers && event.headers['User-Agent']);

          // For APIGW access logs
          trans.$.schema.transactionId = event.requestContext.requestId;
        }
        // Capture Event Data: aws.apigatewayv2.http
        else if (eventType === 'aws.apigatewayv2.http') {
          const timestamp = event.requestContext.timeEpoch || Date.now().valueOf();
          trans.set('event.timestamp', new Date(timestamp).toISOString());
          trans.set('event.source', 'aws.apigatewayv2');
          trans.set('event.custom.accountId', event.requestContext.accountId);
          trans.set('event.custom.apiId', event.requestContext.apiId);
          trans.set('event.custom.domainPrefix', event.requestContext.domainPrefix);
          trans.set('event.custom.domain', event.requestContext.domainName);
          trans.set('event.custom.requestId', event.requestContext.requestId);
          trans.set('event.custom.requestTime', event.requestContext.time);
          trans.set('event.custom.requestTimeEpoch', event.requestContext.timeEpoch);
          trans.set('event.custom.httpPath', event.requestContext.http.path);
          trans.set('event.custom.httpMethod', event.requestContext.http.method);
          trans.set('event.custom.xTraceId', event.headers && event.headers['x-amzn-trace-id']);
          trans.set('event.custom.userAgent', event.headers && event.headers['user-agent']);

          // For APIGW access logs
          trans.$.schema.transactionId = event.requestContext.requestId;
        }
        trans.set('event.custom.stage', meta.stageName);

        const transactionSpans = trans.$.spans;
        const transactionEventTags = trans.$.eventTags;

        /*
         * Callback Wrapper
         * - TODO: Inspect outgoing HTTP status codes
         */

        let capturedError = null;
        let finalized = false;
        const finalize = (error, cb) => {
          if (finalized) {
            console.warn(
              'WARNING: Callback/response already delivered.  Did your function invoke the callback and also return a promise? ' +
                'For more details, see: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html'
            );
            return;
          }
          clearTimeout(timeoutHandler);
          try {
            if (capturedError) {
              trans.error(capturedError, false, cb);
            } else if (error) {
              trans.error(error, true, cb);
            } else {
              trans.end();
              cb();
            }
          } finally {
            finalized = true;
            // Remove the span listeners
            spanEmitter.removeAllListeners('span');
          }
        };

        // Patch context methods
        const contextProxy = new Proxy(context, {
          get: (target, prop) => {
            if (prop === 'done') {
              return (err, res) => {
                finalize(err, () => target.done(err, res));
              };
            } else if (prop === 'succeed') {
              return (res) => {
                finalize(null, () => target.succeed(res));
              };
            } else if (prop === 'fail') {
              return (err) => {
                finalize(err, () => target.fail(err));
              };
            } else if (prop === 'captureError') {
              return (err) => {
                capturedError = err;
              };
            }
            return target[prop];
          },
        });

        contextProxy.serverlessSdk = {};
        contextProxy.captureError = (err) => {
          capturedError = err;
        };
        contextProxy.serverlessSdk.captureError = contextProxy.captureError; // TODO deprecate in next major rev
        ServerlessSDK._captureError = contextProxy.captureError;

        // Set up span listener
        let totalSpans = 0;
        spanEmitter.on('span', (span) => {
          totalSpans += 1;
          trans.set('totalSpans', totalSpans);
          if (transactionSpans >= 50) {
            return;
          }
          transactionSpans.push(span);
        });

        // user spans
        contextProxy.span = (tag, userCode) => {
          const startTime = new Date();

          const end = (result) => {
            const endTime = new Date();
            spanEmitter.emit('span', {
              tags: {
                type: 'custom',
                label: tag,
              },
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              duration: endTime.getTime() - startTime.getTime(),
            });
            return result;
          };

          let result;
          try {
            result = userCode();
          } catch (e) {
            end();
            throw e;
          }
          if (isThenable(result)) return result.then(end);
          return end(result);
        };
        contextProxy.serverlessSdk.span = contextProxy.span; // TODO deprecate in next major rev
        ServerlessSDK._span = contextProxy.span;

        contextProxy.serverlessSdk.tagEvent = (tagName, tagValue = '', custom = {}) => {
          transactionEventTags.push({
            tagName: tagName.toString(),
            tagValue: tagValue.toString(),
            custom: JSON.stringify(custom),
          });
          if (transactionEventTags.length > 10) {
            transactionEventTags.pop();
          }
        };
        ServerlessSDK._tagEvent = contextProxy.serverlessSdk.tagEvent;

        contextProxy.serverlessSdk.setEndpoint = (endpoint) => {
          let value;
          let httpMethod;
          let httpStatusCode;
          let metadata;
          if (typeof endpoint === 'string' || endpoint instanceof String) {
            value = endpoint;
          } else {
            ({ endpoint: value, httpMethod, httpStatusCode, metadata } = endpoint);
          }
          if (value) trans.$.schema.endpoint = value;
          if (httpMethod) trans.$.schema.httpMethod = httpMethod;
          if (httpStatusCode) trans.$.schema.httpStatusCode = String(httpStatusCode);
          trans.$.schema.endpointMechanism = metadata ? metadata.mechanism : 'explicit';
        };
        ServerlessSDK._setEndpoint = contextProxy.serverlessSdk.setEndpoint;

        contextProxy.serverlessSdk.getTransactionId = () => trans.$.schema.transactionId;
        ServerlessSDK._getTransactionId = contextProxy.serverlessSdk.getTransactionId;

        contextProxy.serverlessSdk.getDashboardUrl = (transactionId) => {
          const domain =
            this.$.serverlessPlatformStage === 'prod' ? 'serverless' : 'serverless-dev';
          return [
            `https://app.${domain}.com`,
            trans.$.schema.tenantId,
            'apps',
            trans.$.schema.applicationName,
            trans.$.schema.serviceName,
            trans.$.schema.stageName,
            trans.$.schema.compute.region,
            'explorer',
            transactionId || contextProxy.serverlessSdk.getTransactionId(),
          ].join('/');
        };
        ServerlessSDK._getDashboardUrl = contextProxy.serverlessSdk.getDashboardUrl;

        /*
         * Try Running Code
         */

        let result;

        try {
          /**
           * Call the function code
           */
          result = fn(event, contextProxy, (err, res) => finalize(err, () => callback(err, res)));
        } catch (error) {
          finalize(error, () => context.fail(error));
          return null;
        }

        // If promise was returned, handle it
        if (result && typeof result.then === 'function') {
          return result
            .then((res) => {
              // In a AWS Lambda 'async' handler, an error can be returned directly
              // This makes it look like a valid response, which it's not.
              // The SDK needs to look out for this here, so it can still log/report the error like all others.
              if (res instanceof Error) {
                return new Promise((resolve) => finalize(res, resolve)).then(() => res);
              }
              return new Promise((resolve) => finalize(null, resolve)).then(() => res);
            })
            .catch((err) => {
              return new Promise((resolve) => finalize(err, resolve)).then(() => {
                throw err;
              });
            });
        }
        return result;
      };
    }
    throw new Error(
      `ServerlessSDK: Invalid Functions-as-a-Service compute type "${meta.computeType}"`
    );
  }

  static captureError(error) {
    ServerlessSDK._captureError(error);
  }

  static span(label, userCode) {
    return ServerlessSDK._span(label, userCode);
  }

  static tagEvent(label, tag, custom) {
    ServerlessSDK._tagEvent(label, tag, custom);
  }

  static setEndpoint(endpoint) {
    ServerlessSDK._setEndpoint(endpoint);
  }

  static getTransactionId() {
    return ServerlessSDK._getTransactionId();
  }

  static getDashboardUrl(transactionId) {
    return ServerlessSDK._getDashboardUrl(transactionId);
  }
}

/*
 * Exports
 */

module.exports = ServerlessSDK;
