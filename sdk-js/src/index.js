'use strict';

/*
 * Spans and Monkey Patching
 */
const EventEmitter = require('events');
const isThenable = require('type/thenable/is');

const spanEmitter = new EventEmitter();

require('./lib/spanHooks/hookAwsSdk')(spanEmitter);
require('./lib/spanHooks/hookHttp')(spanEmitter);

/*
 * Serverless SDK
 */

const os = require('os');
const ServerlessTransaction = require('./lib/transaction.js');
const detectEventType = require('./lib/eventDetection');

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
          eventType,
        });

        const timeoutHandler = setTimeout(
          () => trans.report(),
          (config.timeout * 1000 || 6000) - 50
        ).unref();

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
        // eslint-disable-next-line no-underscore-dangle
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
          trans.set('event.custom.xTraceId', event.headers['X-Amzn-Trace-Id']);
          trans.set('event.custom.userAgent', event.headers['User-Agent']);

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
          if (finalized) return;
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
              return res => {
                finalize(null, () => target.succeed(res));
              };
            } else if (prop === 'fail') {
              return err => {
                finalize(err, () => target.fail(err));
              };
            } else if (prop === 'captureError') {
              return err => {
                capturedError = err;
              };
            }
            return target[prop];
          },
        });

        contextProxy.serverlessSdk = {};
        contextProxy.captureError = err => {
          capturedError = err;
        };
        contextProxy.serverlessSdk.captureError = contextProxy.captureError; // TODO deprecate in next major rev
        // eslint-disable-next-line no-underscore-dangle
        ServerlessSDK._captureError = contextProxy.captureError;

        // Set up span listener
        let totalSpans = 0;
        spanEmitter.on('span', span => {
          totalSpans += 1;
          trans.set('totalSpans', totalSpans);
          if (transactionSpans >= 50) {
            return;
          }
          transactionSpans.push(span);
        });

        // user spans
        contextProxy.span = (tag, userCode) => {
          const startTime = new Date().toISOString();
          const start = Date.now();

          const end = () => {
            const endTime = new Date().toISOString();
            spanEmitter.emit('span', {
              tags: {
                type: 'custom',
                label: tag,
              },
              startTime,
              endTime,
              duration: Date.now() - start,
            });
          };

          let result;
          try {
            result = userCode();
          } catch (e) {
            end();
            throw e;
          }
          if (isThenable(result)) return result.then(end);
          end();
          return null;
        };
        contextProxy.serverlessSdk.span = contextProxy.span; // TODO deprecate in next major rev
        // eslint-disable-next-line no-underscore-dangle
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
        // eslint-disable-next-line no-underscore-dangle
        ServerlessSDK._tagEvent = contextProxy.serverlessSdk.tagEvent;

        /*
         * Try Running Code
         */

        let result;
        try {
          result = fn(event, contextProxy, (err, res) => finalize(err, () => callback(err, res)));
        } catch (error) {
          finalize(error, () => context.fail(error));
        }

        // If promise was returned, handle it
        if (result && typeof result.then === 'function') {
          return result
            .then(res => {
              // In a AWS Lambda 'async' handler, an error can be returned directly
              // This makes it look like a valid response, which it's not.
              // The SDK needs to look out for this here, so it can still log/report the error like all others.
              if (res instanceof Error) {
                return new Promise(resolve => finalize(res, resolve)).then(() => res);
              }
              return new Promise(resolve => finalize(null, resolve)).then(() => res);
            })
            .catch(err => {
              return new Promise(resolve => finalize(err, resolve)).then(() => {
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
    // eslint-disable-next-line no-underscore-dangle
    ServerlessSDK._captureError(error);
  }

  static span(label, userCode) {
    // eslint-disable-next-line no-underscore-dangle
    ServerlessSDK._span(label, userCode);
  }

  static tagEvent(label, tag, custom) {
    // eslint-disable-next-line no-underscore-dangle
    ServerlessSDK._tagEvent(label, tag, custom);
  }
}

/*
 * Exports
 */

module.exports = ServerlessSDK;
