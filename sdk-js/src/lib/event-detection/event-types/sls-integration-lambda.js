'use strict';

const { get } = require('lodash');

/* This module supports the "lambda" type integration
   for the serverless framework which provides a
   default custom mapping template.

   The sls mapping template is described here:
   https://serverless.com/framework/docs/providers/aws/events/apigateway/#example-lambda-event-before-customization
 */

const type = 'aws.apigateway.http';

const keys = ['body', 'method', 'principalId', 'stage'];

const keysThatNeedValues = ['identity.userAgent', 'identity.sourceIp', 'identity.accountId'];

module.exports = function eventType(event) {
  if (typeof event === 'object') {
    const keysArePresent = keys.every((key) => key in event);
    const valuesArePresent =
      keysThatNeedValues
        .map((key) => {
          return typeof get(event, key) !== 'undefined';
        })
        .filter(Boolean).length === keysThatNeedValues.length;
    return keysArePresent && valuesArePresent ? type : false;
  }
  return false;
};
