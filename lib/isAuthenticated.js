'use strict';

const { getLoggedInUser } = require('@serverless/platform-sdk');

module.exports = () => Boolean(getLoggedInUser() || process.env.SERVERLESS_ACCESS_KEY);
