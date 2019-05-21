const alexaSkill = require('./eventTypes/alexaSkill')
const apiGateway = require('./eventTypes/apiGateway')
const cloudFront = require('./eventTypes/cloudFront')
const firehose = require('./eventTypes/firehose')
const kinesis = require('./eventTypes/kinesis')
const s3 = require('./eventTypes/s3')
const scheduled = require('./eventTypes/scheduled')
const slsIntegrationLamb = require('./eventTypes/slsIntegrationLambda')
const sns = require('./eventTypes/sns')
const sqs = require('./eventTypes/sqs')

const detectEventType = (event) =>
  alexaSkill(event) ||
  apiGateway(event) ||
  cloudFront(event) ||
  firehose(event) ||
  kinesis(event) ||
  s3(event) ||
  scheduled(event) ||
  slsIntegrationLamb(event) ||
  sns(event) ||
  sqs(event) ||
  null

module.exports = detectEventType
