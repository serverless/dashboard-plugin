require('./runtime')
const { version } = require('@serverless/platform-sdk/package.json')

module.exports = require('./lib/plugin').default
module.exports.sdkVersion = version
