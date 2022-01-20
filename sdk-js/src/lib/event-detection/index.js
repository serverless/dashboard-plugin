'use strict';

const alexaSkill = require('./event-types/alexa-skill');
const apiGateway = require('./event-types/api-gateway');
const apiGatewayV2 = require('./event-types/api-gateway-v2');
const customAuthorizer = require('./event-types/customAuthorizer');
const cloudFront = require('./event-types/cloudFront');
const cloudwatchEvent = require('./event-types/cloudwatch-event');
const cloudwatchLogs = require('./event-types/cloudwatch-log');
const dynamodb = require('./event-types/dynamodb');
const firehose = require('./event-types/firehose');
const kinesis = require('./event-types/kinesis');
const s3 = require('./event-types/s3');
const scheduled = require('./event-types/scheduled');
const ses = require('./event-types/ses');
const sns = require('./event-types/sns');
const sqs = require('./event-types/sqs');

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
