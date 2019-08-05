'use strict';

module.exports.sync = () => {
  return "syncReturn";
};

module.exports.syncError = () => {
  throw new Error('syncError');
};

module.exports.async = async () => {
  return "asyncReturn";
};

module.exports.asyncDanglingCallback = async () => {
  setTimeout(() => true, 1000000);
  return "asyncDanglyReturn";
};

module.exports.asyncError = async () => {
  throw new Error('asyncError');
};

module.exports.callback = (event, context, callback) => {
  setTimeout(() => callback(null, "callbackReturn"), 5000);
};

module.exports.callbackError = (event, context, callback) => {
  callback('callbackError');
};

module.exports.done = (event, context) => {
  context.done(null, "doneReturn");
};

module.exports.doneError = (event, context) => {
  context.done('doneError');
};

module.exports.fail = (event, context) => {
  context.fail('failError');
};

module.exports.succeed = (event, context) => {
  context.succeed("succeedReturn");
};

module.exports.promiseAndCallbackRace = async (event, context, callback) => {

}
