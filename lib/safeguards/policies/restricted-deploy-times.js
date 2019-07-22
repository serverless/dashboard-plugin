'use strict';

const moment = require('moment');
const { parse } = require('iso8601-duration');

module.exports = function restrictedDeployTimesPolicy(policy, service, options = []) {
  const now = moment();

  for (let { time, duration, interval } of Array.isArray(options) ? options : [options]) {
    time = moment(time);
    duration = moment.duration(parse(duration));
    interval = interval && moment.duration(parse(interval));

    while (time.isBefore(now)) {
      const end = time.clone();
      end.add(duration);
      if (end.isAfter(now)) {
        policy.fail(`Deploying on ${now.format('YYYY-MM-DD')} is not allowed`);
        return;
      }
      if (interval) {
        time.add(interval);
      } else {
        break;
      }
    }
  }
  policy.approve();
};

module.exports.docs = 'http://slss.io/sg-deploy-times';
