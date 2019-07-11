const requireHook = require('require-in-the-middle')
const { captureAwsRequestSpan } = require('./parsers')

module.exports = (emitter) => {
  requireHook(['aws-sdk'], (awsSdk) => {
    // Skip patching for extremely old version of aws-sdk that lack the necessary events
    if (!awsSdk.Request || !awsSdk.Request.prototype.send || !awsSdk.Request.prototype.on) {
      return awsSdk
    }

    // Monkey patch the send method with a proxy
    awsSdk.Request.prototype.send = new Proxy(awsSdk.Request.prototype.send, {
      apply: (_send, _thisRequest, _args) => {
        // When the request is complete, capture span info
        _thisRequest.on('complete', (_resp) => {
          const span = captureAwsRequestSpan(_resp)
          emitter.emit('span', span)
        })
        // Send the request as usual
        return _send.apply(_thisRequest, _args)
      }
    })

    return awsSdk
  })
}
