import { get } from 'lodash'

const type = 'alexaSkill'

export default function eventType(e = {}) {
  return get(e, 'session.attributes') &&
    get(e, 'session.user') &&
    get(e, 'context.System') &&
    get(e, 'request.requestId')
    ? type
    : false
}
