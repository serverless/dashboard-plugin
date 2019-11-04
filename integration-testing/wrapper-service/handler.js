'use strict';
const https = require('https');
const AWS = require('aws-sdk');
// eslint-disable-next-line import/no-unresolved
const { tagEvent, span } = require('./serverless_sdk');

module.exports.sync = () => {
  return 'syncReturn';
};

module.exports.syncError = () => {
  throw new Error('syncError');
};

module.exports.async = async () => {
  return 'asyncReturn';
};

module.exports.asyncDanglingCallback = async () => {
  setTimeout(() => true, 1000000);
  return 'asyncDanglyReturn';
};

module.exports.asyncError = async () => {
  throw new Error('asyncError');
};

module.exports.callback = (event, context, callback) => {
  setTimeout(() => callback(null, 'callbackReturn'), 5000);
};

module.exports.callbackError = (event, context, callback) => {
  callback('callbackError');
};

module.exports.done = (event, context) => {
  context.done(null, 'doneReturn');
};

module.exports.doneError = (event, context) => {
  context.done('doneError');
};

module.exports.fail = (event, context) => {
  context.fail('failError');
};

module.exports.succeed = (event, context) => {
  context.succeed('succeedReturn');
};

module.exports.promiseAndCallbackRace = async (event, context, callback) => {
  callback(null, 'callbackEarlyReturn');
  return 'asyncReturn';
};

module.exports.eventTags = async () => {
  tagEvent('event-tagged', 'true', { customerId: 5, userName: 'aaron.stuyvenberg' });
  return 'asyncReturn';
};

module.exports.spans = async (event, context) => {
  let sts;
  span('create sts client', () => {
    sts = new AWS.STS();
  });
  await sts.getCallerIdentity().promise();
  await new Promise((resolve, reject) => {
    const req = https.request({ host: 'httpbin.org', path: '/post', method: 'POST' }, resp => {
      let data = '';
      resp.on('data', chunk => {
        data += chunk;
      });
      resp.on('end', () => {
        resolve(data);
      });
    });
    req.on('error', reject);
    req.end();
  });
  await context.span('asynctest', async () => {
    await new Promise((resolve, reject) => {
      const req = https.get({ host: 'example.com', path: '/', method: 'get' }, resp => {
        let data = '';
        resp.on('data', chunk => {
          data += chunk;
        });
        resp.on('end', () => {
          resolve(data);
        });
      });
      req.on('error', reject);
    });
  });
};

module.exports.noWaitForEmptyLoop = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  https.get({ host: 'httpbin.org', path: '/delay/10' });
  callback(null, 'noWaitForEmptyLoop');
};

module.exports.timeout = async () => await new Promise(resolve => setTimeout(resolve, 10000));
