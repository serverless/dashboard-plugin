import { join } from 'path';
import { createHash } from 'crypto';
import ua from 'universal-analytics';
import fs from 'fs-extra';
import _ from 'lodash';
import uuid from 'uuid';
import debugLib from 'debug';

const debug = debugLib('serverless-plugin-iopipe:track');

export function getVisitor(pluginInstance) {
  // create consistent, yet anonymized id for usage stats
  let pkg = {};
  if (!pluginInstance.getOptions().noStats) {
    try {
      pkg = fs.readJsonSync(join(pluginInstance.prefix, 'package.json'));
    } catch (err) {
      _.noop();
    }
  }
  const str =
    pkg.author ||
    _.get(pkg, 'repository.url') ||
    pkg.name ||
    pkg.homepage ||
    uuid.v4();
  const userId = createHash('md5')
    .update(str)
    .digest('hex');
  const visitor = ua('UA-73165042-2', userId, {
    strictCidFormat: false,
    https: true
  });
  return visitor;
}

export function track(pluginInstance, obj = {}) {
  const { visitor } = pluginInstance;
  if (!visitor) {
    return Promise.resolve('no-visitor');
  }
  if (pluginInstance.getOptions().noStats) {
    return Promise.resolve('no-stats');
  }
  const { category = 'event', action = 'action', label = 'label', value } = obj;
  const newLabel = _.isString(label) ? label : JSON.stringify(label);
  debug(`Tracking ${category}: ${action}`);
  return new Promise((resolve, reject) => {
    visitor.event(category, action, newLabel, value, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}
