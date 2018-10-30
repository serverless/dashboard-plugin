import _ from 'lodash';

export default function(startTime = process.hrtime(), suffix = true) {
  const endTime = process.hrtime(startTime);
  const millis = _.round(endTime[0] * 1000 + endTime[1] / 1000000);
  return suffix ? `${millis}ms` : millis;
}
