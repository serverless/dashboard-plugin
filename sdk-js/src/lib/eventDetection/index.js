'use strict';

const alexaSkill = require('./eventTypes/alexaSkill');
const apiGateway = require('./eventTypes/apiGateway');
const apiGatewayV2 = require('./eventTypes/apiGatewayV2');
const customAuthorizer = require('./eventTypes/customAuthorizer');
const cloudFront = require('./eventTypes/cloudFront');
const cloudwatchEvent = require('./eventTypes/cloudwatchEvent');
const cloudwatchLogs = require('./eventTypes/cloudwatchLog');
const dynamodb = require('./eventTypes/dynamodb');
const firehose = require('./eventTypes/firehose');
const kinesis = require('./eventTypes/kinesis');
const s3 = require('./eventTypes/s3');
const scheduled = require('./eventTypes/scheduled');
const ses = require('./eventTypes/ses');
const sns = require('./eventTypes/sns');
const sqs = require('./eventTypes/sqs');

const detectEventType = (event) =>
  alexaSkill(event) ||
  // Custom authorizer must come before apiGateway because they share similar keys.
  customAuthorizer(event) ||
  apiGateway(event) ||
  apiGatewayV2(event) ||
  cloudFront(event) ||
  cloudwatchLogs(event) ||
  firehose(event) ||
  kinesis(event) ||
  s3(event) ||
  scheduled(event) ||
  ses(event) ||
  sns(event) ||
  sqs(event) ||
  dynamodb(event) ||
  // Cloudwatch events should be last because it lacks distinguishing characteristics
  // and closely resembles a scheduled event
  cloudwatchEvent(event) ||
  null;

module.exports = detectEventType;
