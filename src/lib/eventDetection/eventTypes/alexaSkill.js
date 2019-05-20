import idx from 'idx';
import flatten from 'flat';

import { pluginName } from '../util/constants';

const type = 'alexaSkill';

function eventType(e = {}) {
  return idx(e, o => o.session.attributes) &&
    idx(e, o => o.session.user) &&
    idx(e, o => o.context.System) &&
    idx(e, o => o.request.requestId)
    ? type
    : false;
}

const keyBlacklist = [
  'context.System.apiAccessToken',
  'context.System.user.accessToken',
  'context.System.user.permissions.consentToken'
];

function plugin(event, log) {
  const obj = flatten(event);
  Object.keys(obj)
    .filter(s => keyBlacklist.indexOf(s) === -1)
    .forEach(key => {
      const val = obj[key];
      if (typeof val !== 'object' || Object.keys(val).length) {
        log(`${pluginName}.${type}.${key}`, val);
      }
    });
  log(`${pluginName}.eventType`, type);
}

export { eventType, plugin };
