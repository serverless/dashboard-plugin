const { get } = require('lodash')

const type = 'aws.alexaskill'

module.exports = function eventType(e = {}) {
  return get(e, 'session.attributes') &&
    get(e, 'session.user') &&
    get(e, 'context.System') &&
    get(e, 'request.requestId')
    ? type
    : false
}
