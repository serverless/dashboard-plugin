'use strict';

const alexaSkill = require('./eventTypes/alexaSkill');
const apiGateway = require('./eventTypes/apiGateway');
const customAuthorizer = require('./eventTypes/customAuthorizer');
const cloudFront = require('./eventTypes/cloudFront');
const firehose = require('./eventTypes/firehose');
const kinesis = require('./eventTypes/kinesis');
const s3 = require('./eventTypes/s3');
const scheduled = require('./eventTypes/scheduled');
const sns = require('./eventTypes/sns');
const sqs = require('./eventTypes/sqs');

const detectEventType = (event) =>
  alexaSkill(event) ||
  // Custom authorizer must come before apiGateway because they share similar keys.
  customAuthorizer(event) ||
  apiGateway(event) ||
  cloudFront(event) ||
  firehose(event) ||
  kinesis(event) ||
  s3(event) ||
  scheduled(event) ||
  sns(event) ||
  sqs(event) ||
  null;

module.exports = detectEventType;
