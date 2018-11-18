/*
* Transaction
*/

const os = require('os')
const _ = require('lodash')
const flatten = require('flat')
const camelCaseKeys = require('camelcase-keys')
const uuidv4 = require('uuid/v4')
const elastic = require('elastic-apm-node')

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
      throw new Error(`ServerlessSDK: Missing Configuration - To use MALT features, "${missing}" is required in your configuration`)
    }

    this.$ = {
      schema: null,
      eTransaction: null,
      duration: Date.now(), // start transaction timer
    }

    /*
    * Prepare transaction schema
    */

    this.$.schema = _.cloneDeep(schemas.transactionFunction)
    this.$.schema.timestamp = (new Date()).toISOString()
    this.$.schema.transactionId = uuidv4()
    this.$.schema.traceId = uuidv4()
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
      this.$.schema.event.timestamp = (new Date()).toISOString()
    }
    // Extend Schema: If "event" is "aws.apigateway"
    if (this.$.schema.event.type === 'aws.apigateway.http') {
      if (!schemas.eventAwsApiGatewayHttp) {
        schemas.eventAwsApiGatewayHttp = require('./schemas/transaction-function-event-awsapigatewayhttp.json')
      }
      this.$.schema.event.custom = _.cloneDeep(schemas.eventAwsApiGatewayHttp)
    }

    /*
    * Prepare ElasticSearch
    */

    // Start Elastic
    if (!elastic.isStarted()) {
      elastic.start({
        serviceName: data.serviceName,
        serverUrl: 'http://apm.signalmalt.com',
        logLevel: 'fatal', // 'trace', 'debug', 'fatal'
        // secretToken: '',
      })
    }

    if (data.computeType === 'aws.lambda') {
      this.$.eTransaction = elastic.startTransaction(data.functionName, 'lambda')
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
  * Span
  */

  /*
  * Error
  * - Sends the error and ends the transaction
  */

  error(error, cb) {
    // Create Error ID
    // Includes error name and message separated by these characters: !$
    // Back-end components rely on this format so don't change it without consulting others
    let id = error.name || 'Unknown'
    id = error.message ? id + '!$' + error.message.toString().substring(0, 200) : id
    this.set('error.id', id)
    elastic.captureError(error)
    // Log
    console.log('')
    console.error(error)
    console.log(`${os.EOL}**** This error was logged & reported by the ServerlessSDK ****${os.EOL}`)
    // End transaction
    this.end(cb)
  }

  /*
  * End
  */

  end(cb) {

    // End transaction timer
    let duration = Date.now() - this.$.duration
    this.set('compute.duration', duration)

    // Flatten and camelCase schema because EAPM tags are only key/value=string
    let tags = flatten(this.$.schema)
    tags = camelCaseKeys(tags)
    this.$.eTransaction.addTags(tags)
    this.$.eTransaction.end()
    elastic.flush(cb)
    if (cb) return cb()
  }
}

module.exports = Transaction
