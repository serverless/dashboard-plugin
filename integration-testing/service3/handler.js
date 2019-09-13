'use strict';
const https = require('https');
const AWS = require('aws-sdk');

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

module.exports.spans = async () => {
  const sts = new AWS.STS();
  await sts.getCallerIdentity().promise();
  await new Promise((resolve, reject) => {
    const req = https.request({host: 'httpbin.org', path: '/post', method: 'POST'},resp => {
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
  await new Promise((resolve, reject) => {
    const req = https.get({host: 'example.com', path: '/', method: 'get'}, resp => {
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
};
