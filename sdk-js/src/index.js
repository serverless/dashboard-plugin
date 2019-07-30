'use strict';

/*
 * Spans and Monkey Patching
 */
const EventEmitter = require('events');

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

    this.$.tenantId = obj.tenantId || null;
    this.$.appUid = obj.appUid || null;
    this.$.tenantUid = obj.tenantUid || null;
    this.$.deploymentUid = obj.deploymentUid || null;
    this.$.applicationName = obj.applicationName || null;
    this.$.serviceName = obj.serviceName || null;
    this.$.stageName = obj.stageName || null;
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
    meta.tenantId = meta.tenantId || (this.$.tenantId || null);
    meta.applicationName = meta.applicationName || (this.$.applicationName || null);
    meta.appUid = meta.appUid || (this.$.appUid || null);
    meta.tenantUid = meta.tenantUid || (this.$.tenantUid || null);
    meta.deploymentUid = meta.deploymentUid || (this.$.deploymentUid || null);
    meta.serviceName = meta.serviceName || (this.$.serviceName || null);
    meta.stageName = meta.stageName || (this.$.stageName || null);
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
          tenantId: meta.tenantId,
          applicationName: meta.applicationName,
          appUid: meta.appUid,
          tenantUid: meta.tenantUid,
          deploymentUid: meta.deploymentUid,
          serviceName: meta.serviceName,
          stageName: meta.stageName,
          functionName: meta.functionName,
          timeout: meta.timeout,
          computeType: meta.computeType,
          eventType,
        });

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

        /*
         * Callback Wrapper
         * - TODO: Inspect outgoing HTTP status codes
         */

        let capturedError = null;
        let finalized = false;
        const finalize = error => {
          if (finalized) return;
          try {
            if (capturedError) {
              trans.error(capturedError, false);
            } else if (error) {
              trans.error(error, true);
            } else {
              trans.end();
            }
          } finally {
            finalized = true;
            // Remove the span listeners
            spanEmitter.removeAllListeners('span');
          }
        };

        // Patch context methods
        const { done, succeed, fail } = context;
        context.done = (err, res) => {
          finalize(err);
          done(err, res);
        };
        context.succeed = res => {
          finalize(null);
          succeed(res);
        };
        context.fail = err => {
          finalize(err);
          fail(err);
        };
        context.captureError = err => {
          capturedError = err;
        };
        // eslint-disable-next-line no-underscore-dangle
        ServerlessSDK._captureError = context.captureError;

        // Set up span listener
        spanEmitter.on('span', span => {
          transactionSpans.push(span);
        });

        /*
         * Try Running Code
         */

        let result;
        try {
          result = fn(event, context, (err, res) => {
            finalize(err);
            callback(err, res);
          });
        } catch (error) {
          finalize(error);
          throw error;
        }

        // If promise was returned, handle it
        if (result && typeof result.then === 'function') {
          return result
            .then(data => {
              // In a AWS Lambda 'async' handler, an error can be returned directly
              // This makes it look like a valid response, which it's not.
              // The SDK needs to look out for this here, so it can still log/report the error like all others.
              if (data instanceof Error) {
                finalize(data, null);
              } else {
                finalize(null, data);
              }
            })
            .catch(err => {
              finalize(err, null);
              throw err;
            });
        }
        finalize(null);
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
}

/*
 * Exports
 */

module.exports = ServerlessSDK;
