import idx from 'idx'

const type = 'alexaSkill'

function eventType(e = {}) {
  return idx(e, (o) => o.session.attributes) &&
    idx(e, (o) => o.session.user) &&
    idx(e, (o) => o.context.System) &&
    idx(e, (o) => o.request.requestId)
    ? type
    : false
}

export { eventType }
