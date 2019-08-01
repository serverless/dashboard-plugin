'use strict';

module.exports.sync = () => {
  return { statusCode: 200 };
};

module.exports.syncError = () => {
  throw new Error('syncError');
};

module.exports.async = async () => {
  return { statusCode: 200 };
};

module.exports.asyncDanglingCallback = async () => {
  setTimeout(() => true, 1000000);
  return { statusCode: 200 };
};

module.exports.asyncError = async () => {
  throw new Error('asyncError');
};

module.exports.callback = (event, context, callback) => {
  setTimeout(() => callback(null, { statusCode: 200 }, 10));
};

module.exports.callbackError = (event, context, callback) => {
  callback('callbackError');
};

module.exports.done = (event, context) => {
  context.done(null, { statusCode: 200 });
};

module.exports.doneError = (event, context) => {
  context.done('doneError');
};

module.exports.fail = (event, context) => {
  context.fail('failError');
};

module.exports.succeed = (event, context) => {
  context.succeed({ statusCode: 200 });
};
