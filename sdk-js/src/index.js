/*
* Serverless SDK
*/

const os = require('os')
const path = require('path')
const _ = require('lodash')
const ServerlessTransaction = require('./lib/transaction.js')

/*
* Serverless SDK Class
*/

class ServerlessSDK {

  /*
  * Constructor
  */

  constructor(obj) {
    this.$ = {}
    this.$.config = {}
    this.$.config.debug = obj.tenantId || false

    this.$.tenantId = obj.tenantId || null
    this.$.applicationName = obj.applicationName || null
    this.$.serviceName = obj.serviceName || null
    this.$.stageName = obj.stageName || null
  }

  /*
  * Transaction
  * - Creates a new transaction
  */

  transaction(data) {
    return new ServerlessTransaction(data)
  }

  /*
  * Handler
  * - TODO: Perhaps accept config OR function (config is better because it captures load errors)
  */

  handler(fn, config) {

    const self = this
    const meta = {}
    config = config || {}

    // Enforce required config
    let missing
    if (!config.functionName) missing = 'functionName'
    if (missing) throw new Error(`ServerlessSDK: Handler requires a ${missing} property in a config object`)

    // Add global defaults
    meta.tenantId = meta.tenantId || (this.$.tenantId || null)
    meta.applicationName = meta.applicationName || (this.$.applicationName || null)
    meta.serviceName = meta.serviceName || (this.$.serviceName || null)
    meta.stageName = meta.stageName || (this.$.stageName || null)
    meta.functionName = config.functionName
    meta.computeType = config.computeType || null

    /*
    * Auto-Detect: Compute Type
    */

    if (!meta.computeType) {
      // AWS Lambda
      if (process.env.AWS_LAMBDA_FUNCTION_NAME) meta.computeType = 'aws.lambda'
    }

    /*
    * Wrapper: AWS Lambda
    */
    if (config.computeType === 'aws.lambda') {
      return (event, context, callback) => {

        // Defaults
        const functionContext = this
        event = event || {}
        context = context || {}

        /*
        * Auto-Detect: Event Type
        */

        // aws.apigateway.http
        if (!config.eventType && event.httpMethod && event.headers && event.requestContext) {
          meta.eventType = 'aws.apigateway.http'
        }

        // Start transaction
        const trans = self.transaction(meta)

        // Capture Compute Data: aws.lambda
        trans.set('compute.runtime', `aws.lambda.nodejs.${process.versions.node}`)
        trans.set('compute.region', process.env.AWS_REGION)
        trans.set('compute.memorySize', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE)
        trans.set('compute.custom.functionName', process.env.AWS_LAMBDA_FUNCTION_NAME)
        trans.set('compute.custom.functionVersion', process.env.AWS_LAMBDA_FUNCTION_VERSION)
        trans.set('compute.custom.arn', context.invokedFunctionArn)
        trans.set('compute.custom.region', process.env.AWS_REGION)
        trans.set('compute.custom.memorySize', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE)
        trans.set('compute.custom.invokeId', context.invokeId)
        trans.set('compute.custom.awsRequestId', context.awsRequestId)
        trans.set('compute.custom.xTraceId', process.env._X_AMZN_TRACE_ID)
        trans.set('compute.custom.logGroupName', process.env.AWS_LAMBDA_LOG_GROUP_NAME)
        trans.set('compute.custom.logStreamName', process.env.AWS_LAMBDA_LOG_STREAM_NAME)
        trans.set('compute.custom.envPlatform', process.platform)
        trans.set('compute.custom.envArch', process.arch)
        trans.set('compute.custom.envMemoryTotal', os.totalmem())
        trans.set('compute.custom.envMemoryFree', os.freemem())
        trans.set('compute.custom.envCpus', JSON.stringify(os.cpus()))

        // Capture Event Data: aws.apigateway.http
        if (meta.eventType === 'aws.apigateway.http') {
          trans.set('event.timestamp', (new Date(event.requestContext.requestTimeEpoch)).toISOString())
          trans.set('event.source', 'aws.apigateway')
          trans.set('event.custom.accountId', event.requestContext.accountId)
          trans.set('event.custom.apiId', event.requestContext.apiId)
          trans.set('event.custom.resourceId', event.requestContext.resourceId)
          trans.set('event.custom.domainPrefix', event.requestContext.domainPrefix)
          trans.set('event.custom.stage', event.requestContext.stage)
          trans.set('event.custom.domain', event.requestContext.domainName)
          trans.set('event.custom.requestId', event.requestContext.requestId)
          trans.set('event.custom.extendedRequestId', event.requestContext.extendedRequestId)
          trans.set('event.custom.requestTime', event.requestContext.requestTime)
          trans.set('event.custom.requestTimeEpoch', event.requestContext.requestTimeEpoch)
          trans.set('event.custom.httpPath', event.requestContext.resourcePath)
          trans.set('event.custom.httpMethod', event.requestContext.httpMethod)
          trans.set('event.custom.xTraceId', event.headers['X-Amzn-Trace-Id'])
          trans.set('event.custom.xForwardedFor', event.headers['X-Forwarded-For'])
          trans.set('event.custom.userAgent', event.headers['User-Agent'])
        }

        /*
        * Callback Wrapper
        * - TODO: Inspect outgoing HTTP status codes
        */

        const wrappedCallback = (error, res) => {

          // Temporary Hack - Needed to comply w/ EAPM
          trans.$.eTransaction.setCustomContext({
            lambda: {
              functionName: trans.$.schema.functionName,
              functionVersion: trans.$.schema.compute.custom.functionVersion,
              invokedFunctionArn: trans.$.schema.compute.custom.arn,
              memoryLimitInMB: trans.$.schema.compute.custom.memorySize,
              awsRequestId: trans.$.schema.compute.custom.awsRequestId,
              logGroupName: trans.$.schema.compute.custom.logGroupName,
              logStreamName: trans.$.schema.compute.custom.logStreamName,
              executionEnv: process.env.AWS_EXECUTION_ENV,
              region: trans.$.schema.compute.region,
              input: event,
              output: res,
            }
          })

          const cb = () => {
            callback.call(
              functionContext,
              error || null,
              res || null)
          }

          if (error) { return trans.error(error, cb) }
          else return trans.end(cb)
        }

        // Patch context methods
        context.done = wrappedCallback
        context.succeed = (res) => { return wrappedCallback(null, res) }
        context.fail = (err) => { return wrappedCallback(err, null) }

        /*
        * Try Running Code
        */

        let result
        try {
          result = fn(
            event,
            context,
            wrappedCallback)
        } catch (error) {
          console.error(error)
          wrappedCallback(error, null)
        }

        // If promise was returned, handle it
        if (result && typeof result.then == 'function') {
          result
          .then((data) => {
            wrappedCallback(null, data)
          })
          .catch((error) => {
            console.error(error)
            wrappedCallback(error, null)
          })
        }
      }
    }
  }
}

/*
* Exports
*/

module.exports = ServerlessSDK
