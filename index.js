'use strict';

const platformClientVersion = require('@serverless/platform-client/package').version;

module.exports = require('./lib/plugin');

module.exports.sdkVersion = platformClientVersion;
module.exports.platformClientVersion = platformClientVersion;
