/*
 * Transaction
 */

const os = require('os')
const _ = require('lodash')
const flatten = require('flat')
const camelCaseKeys = require('camelcase-keys')
const uuidv4 = require('uuid/v4')
const { parseError } = require('./parsers')

const TRANSACTION = 'transaction'
const ERROR = 'error'

/*
 * Cache
 */

// Schemas
const schemas = {
  transactionFunction: require('./schemas/transaction-function.json')
}

/*
 * Transaction Class
 */

class Transaction {
  /*
   * Constructor
   */

  constructor(data) {
    // Enforce required properties
    let missing
    if (!data.tenantId) missing = 'tenantId'
    if (!data.applicationName) missing = 'applicationName'
    if (!data.serviceName) missing = 'serviceName'
    if (!data.stageName) missing = 'stageName'
    if (!data.computeType) missing = 'computeType'
    if (missing) {
      throw new Error(
        `ServerlessSDK: Missing Configuration - To use MALT features, "${missing}" is required in your configuration`
      )
    }

    this.processed = false;
    this.$ = {
      schema: null,
      eTransaction: null,
      duration: new Date() // start transaction timer
    }

    /*
     * Prepare transaction schema
     */

    this.$.schema = _.cloneDeep(schemas.transactionFunction)
    this.$.schema.timestamp = new Date().toISOString()
    this.$.schema.transactionId = uuidv4()
    // this.$.schema.traceId = uuidv4();
    this.$.schema.tenantId = data.tenantId
    this.$.schema.applicationName = data.applicationName
    this.$.schema.serviceName = data.serviceName
    this.$.schema.stageName = data.stageName
    this.$.schema.functionName = data.functionName
    this.$.schema.compute.type = data.computeType
    this.$.schema.event.type = data.eventType || 'unknown'

    // Track uptime of container
    this.$.schema.compute.containerUptime = process.uptime()

    // Extend Schema: If "compute" is "aws.lambda"
    if (this.$.schema.compute.type === 'aws.lambda') {
      if (!schemas.computeAwsLambda) {
        schemas.computeAwsLambda = require('./schemas/transaction-function-compute-awslambda.json')
      }
      this.$.schema.compute.custom = _.cloneDeep(schemas.computeAwsLambda)
    }
    // Extend Schema: If "event" is "unknown"
    if (this.$.schema.event.type === 'unknown') {
      this.$.schema.event.timestamp = new Date().toISOString()
    }
    // Extend Schema: If "event" is "aws.apigateway"
    if (this.$.schema.event.type === 'aws.apigateway.http') {
      if (!schemas.eventAwsApiGatewayHttp) {
        schemas.eventAwsApiGatewayHttp = require('./schemas/transaction-function-event-awsapigatewayhttp.json')
      }
      this.$.schema.event.custom = _.cloneDeep(schemas.eventAwsApiGatewayHttp)
    }

    if (data.computeType === 'aws.lambda') {
      this.$.eTransaction = {}
    }

  }

  /*
   * Set
   * - Only allow properties in the schema
   * - If you want to add properties, first add them to the schema.
   */

  set(key, val) {
    if (!_.has(this.$.schema, key)) {
      throw new Error(`ServerlessSDK: Invalid transaction property: "${key}"`)
    }
    if (key && val) _.set(this.$.schema, key, val)
  }

  /*
   * TODO: Span
   */

  /*
   * Error
   * - Sends the error and ends the transaction
   */

  error(error, cb) {
    const self = this
    // Create Error ID
    // Includes error name and message separated by these characters: !$
    // Back-end components rely on this format so don't change it without consulting others
    let id = error.name || 'Unknown'
    id = error.message ? id + '!$' + error.message.toString().substring(0, 200) : id
    this.set('error.id', id)
    // Log
    console.log('')
    console.error(error)

    parseError(error, null, (a, errorStack) => {
      console.log(`${os.EOL}**** This error was logged & reported by the ServerlessSDK ****${os.EOL}`)
      this.set('error.culprit', errorStack.culprit)
      this.set('error.exception.type', errorStack.exception.type)
      this.set('error.exception.message', errorStack.exception.message)
      this.set('error.exception.stacktrace', JSON.stringify(errorStack.exception.stacktrace))

      // End transaction
      this.buildOutput(ERROR) // set this to transaction for now. 
      self.end(cb)
    })
  }

  /*
   * End
   */

  end(cb) {
    if (this.$.schema.error.id === null) {
      this.buildOutput(TRANSACTION)
    }

    return cb ? setImmediate(cb) : true
  }

  buildOutput(type) {
    if (!this.processed) {
      // End transaction timer
      let duration = new Date().getTime() - this.$.duration.getTime()
      this.set('compute.memoryUsed', JSON.stringify(process.memoryUsage()))
      this.set('compute.memoryPercentageUsed', ((process.memoryUsage().heapUsed / Math.pow(1024, 2)).toFixed() / this.$.schema.compute.memorySize) * 100)

      // Flatten and camelCase schema because EAPM tags are only key/value=string
      // Remove flatten? 
      let tags = flatten(this.$.schema)
      tags = camelCaseKeys(tags)
      tags.traceId = tags.computeCustomAwsRequestId

      // if transaction add the request id as the transaction trace
      this.$.schema.traceId = tags.computeCustomAwsRequestId

      // create the envelope needed for parsing 
      // and the span to hold the transaction and event data
      let envelope = require('./schemas/envelope.json')
      let span = require('./schemas/span.json')

      envelope.timestamp = new Date().toISOString()
      envelope.requestId = tags.computeCustomAwsRequestId
      envelope.type = type

      span.operationName = this.$.schema.schemaType
      span.startTime = this.$.schema.timestamp
      span.endTime = new Date().toISOString()
      span.duration = duration
      span.spanContext = {
        traceId: tags.computeCustomAwsRequestId,
        spanId: this.$.schema.transactionId,
        xTraceId: tags.computeCustomXTraceId,
      }
      span.tags = tags
      envelope.payload = span

      console.log(JSON.stringify(envelope))
      this.processed = true
    }
  }
}

module.exports = Transaction
