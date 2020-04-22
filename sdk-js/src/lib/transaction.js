'use strict';

/*
 * Transaction
 */

const _ = require('lodash');
const uuidv4 = require('uuid/v4');
const { parseError } = require('./parsers');
const flatten = require('flat');
const isError = require('type/error/is');
const zlib = require('zlib');

const TRANSACTION = 'transaction';
const ERROR = 'error';
const REPORT = 'report';

let transactionCount = 0;

/*
 * nanosecond time
 */
const nanosecondnow = () => {
  const [seconds, nanoseconds] = process.hrtime();
  return seconds * 1000000000 + nanoseconds;
};

/*
 * Cache
 */

// Schemas
const schemas = {
  transactionFunction: require('./schemas/transaction-function.json'),
};

/*
 * Transaction Class
 */

class Transaction {
  /*
   * Constructor
   */

  constructor(data) {
    // Enforce required properties
    let missing;
    if (!data.orgId) {
      missing = 'orgId';
    }
    if (!data.applicationName) {
      missing = 'applicationName';
    }
    if (!data.appUid) {
      missing = 'appUid';
    }
    if (!data.orgUid) {
      missing = 'orgUid';
    }
    if (!data.serviceName) {
      missing = 'serviceName';
    }
    if (!data.stageName) {
      missing = 'stageName';
    }
    if (!data.computeType) {
      missing = 'computeType';
    }
    if (missing) {
      throw new Error(
        `ServerlessSDK: Missing Configuration - To use MALT features, "${missing}" is required in your configuration`
      );
    }

    this.processed = false;
    this.shouldLogMeta = data.shouldLogMeta;
    transactionCount += 1;
    this.$ = {
      schema: null,
      eTransaction: null,
      duration: nanosecondnow(), // start transaction timer
      spans: [],
      eventTags: [],
    };

    /*
     * Prepare transaction schema
     */

    this.$.schema = _.cloneDeep(schemas.transactionFunction);
    this.$.schema.timestamp = new Date().toISOString();
    this.$.schema.transactionId = uuidv4();
    // this.$.schema.traceId = uuidv4();
    this.$.schema.tenantId = data.orgId;
    this.$.schema.appUid = data.appUid;
    this.$.schema.tenantUid = data.orgUid;
    this.$.schema.applicationName = data.applicationName;
    this.$.schema.serviceName = data.serviceName;
    this.$.schema.stageName = data.stageName;
    this.$.schema.pluginVersion = data.pluginVersion;
    this.$.schema.functionName = data.functionName;
    this.$.schema.timeout = data.timeout;
    this.$.schema.compute.type = data.computeType;
    this.$.schema.event.type = data.eventType || 'unknown';
    this.$.schema.compute.isColdStart = transactionCount === 1;
    this.$.schema.compute.instanceInvocationCount = transactionCount;
    this.$.schema.totalSpans = 0;
    this.$.schema.endpoint = data.endpoint;

    // Track uptime of container
    this.$.schema.compute.containerUptime = process.uptime();

    // Extend Schema: If "compute" is "aws.lambda"
    if (this.$.schema.compute.type === 'aws.lambda') {
      if (!schemas.computeAwsLambda) {
        schemas.computeAwsLambda = require('./schemas/transaction-function-compute-awslambda.json');
      }
      this.$.schema.compute.custom = _.cloneDeep(schemas.computeAwsLambda);
    }
    // Extend Schema: If "event" is "unknown"
    if (this.$.schema.event.type === 'unknown') {
      this.$.schema.event.timestamp = new Date().toISOString();
    }
    // Extend Schema: If "event" is "aws.apigateway"
    if (this.$.schema.event.type === 'aws.apigateway.http') {
      if (!schemas.eventAwsApiGatewayHttp) {
        schemas.eventAwsApiGatewayHttp = require('./schemas/transaction-function-event-awsapigatewayhttp.json');
      }
      this.$.schema.event.custom = _.cloneDeep(schemas.eventAwsApiGatewayHttp);
    } else {
      this.$.schema.event.custom = { stage: null };
    }

    if (data.computeType === 'aws.lambda') {
      this.$.eTransaction = { stageName: null };
    }
  }

  /*
   * Set
   * - Only allow properties in the schema
   * - If you want to add properties, first add them to the schema.
   */

  set(key, val) {
    if (!_.has(this.$.schema, key)) {
      throw new Error(`ServerlessSDK: Invalid transaction property: "${key}"`);
    }
    if (key && val !== undefined) {
      _.set(this.$.schema, key, val);
    }
  }

  /*
   * Error
   * - Sends the error and ends the transaction
   */

  error(error, fatal, cb) {
    const self = this;
    if (isError(error)) {
      // Create Error ID
      // Includes error name and message separated by these characters: !$
      // Back-end components rely on this format so don't change it without consulting others
      let id = error.name || 'Unknown';
      id = error.message ? `${id}!$${error.message.toString().substring(0, 200)}` : id;
      this.set('error.id', id);
      // Log
      console.info('');
      console.error(error);

      parseError(error, null, (res, errorStack) => {
        this.set('error.culprit', errorStack.culprit);
        this.set('error.fatal', fatal);
        this.set('error.exception.type', errorStack.exception.type);
        // sliced to 25 kb: 25 * 1024 / 8 = 3200
        this.set(
          'error.exception.message',
          Buffer.from(errorStack.exception.message)
            .slice(0, 3200)
            .toString()
        );
        this.set('error.exception.stacktrace', JSON.stringify(errorStack.exception.stacktrace));

        // End transaction
        this.buildOutput(ERROR); // set this to transaction for now.
        self.end();
        cb();
      });
    } else {
      // Create Error ID
      // since the user didn't actually thrown an error, just include it with a prefix
      // reflecting it's not an error as the error type
      this.set('error.id', `NotAnErrorType!$${error.toString().substring(0, 200)}`);
      // Log
      console.info('');
      console.error(error);
      // sliced to 25 kb: 25 * 1024 / 8 = 3200
      const message = Buffer.from(error)
        .slice(0, 3200)
        .toString();
      this.set('error.culprit', message);
      this.set('error.fatal', fatal);
      this.set('error.exception.type', 'NotAnErrorType');
      this.set('error.exception.message', message);
      this.set('error.exception.stacktrace', '[]');

      // End transaction
      this.buildOutput(ERROR); // set this to transaction for now.
      self.end();
      cb();
    }
  }

  /*
   * report (on SIGTERM)
   */

  report() {
    this.set(
      'error.id',
      'TimeoutError!$Function execution duration going to exceeded configured timeout limit.'
    );
    this.set('error.culprit', 'timeout');
    this.set('error.fatal', true);
    this.set('error.exception.type', 'TimeoutError');
    this.set(
      'error.exception.message',
      'Function execution duration going to exceeded configured timeout limit.'
    );
    this.set('error.exception.stacktrace', '[]');
    this.buildOutput(REPORT);
    this.end();
  }

  /*
   * End
   */

  end() {
    if (this.$.schema.error.id === null) {
      this.buildOutput(TRANSACTION);
    }
  }

  encodeBody(body) {
    if (!body) return body;
    return Buffer.from(body).toString('base64');
  }

  gzipBody(body) {
    return new Promise((res, rej) => {
      zlib.gzip(body, (error, result) => {
        if (error) {
          rej(error);
        } else {
          res(result);
        }
      });
    });
  }

  buildOutput(type) {
    if (!this.shouldLogMeta) return;
    if (!this.processed) {
      // End transaction timer
      const duration = nanosecondnow() - this.$.duration;
      this.set('compute.memoryUsed', JSON.stringify(process.memoryUsage()));
      this.set(
        'compute.memoryPercentageUsed',
        ((process.memoryUsage().heapUsed / Math.pow(1024, 2)).toFixed() /
          this.$.schema.compute.memorySize) *
          100
      );

      // Flatten and camelCase schema because EAPM tags are only key/value=string
      // not using lodash's flatten bc its for Arrays and schema is an Object
      let tags = flatten(this.$.schema);
      tags = _.mapKeys(tags, (value, key) => _.camelCase(key));
      tags.traceId = tags.computeCustomAwsRequestId;

      // if transaction add the request id as the transaction trace
      this.$.schema.traceId = tags.computeCustomAwsRequestId;

      // create the envelope needed for parsing
      // and the span to hold the transaction and event data
      const envelope = require('./schemas/envelope.json');
      const span = require('./schemas/span.json');

      envelope.timestamp = new Date().toISOString();
      envelope.requestId = tags.computeCustomAwsRequestId;
      envelope.type = type;

      // TODO: Redundant with `spans`? Why is there a singular span on the whole transaction?
      span.operationName = this.$.schema.schemaType;
      span.startTime = this.$.schema.timestamp;
      span.endTime = new Date().toISOString();
      span.duration = duration / 1000000;
      span.spanContext = {
        traceId: tags.computeCustomAwsRequestId,
        spanId: this.$.schema.transactionId,
        xTraceId: tags.computeCustomXTraceId,
      };
      span.tags = tags;
      envelope.payload = span;
      envelope.payload.spans = this.$.spans;
      envelope.payload.eventTags = this.$.eventTags;

      this.gzipBody(JSON.stringify(envelope)).then(zipped => {
        const encoded = this.encodeBody(zipped);

        console.info(
          'SERVERLESS_ENTERPRISE',
          JSON.stringify({ c: true, b: encoded, origin: envelope.origin })
        );
        this.processed = this.$.schema.error.type !== 'TimeoutError';
      });
    }
  }
}

module.exports = Transaction;
