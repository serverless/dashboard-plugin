if (!global._babelPolyfil) {
  require('@babel/polyfill')
}

module.exports = require('./lib/plugin').default
