let handler, handlerError;
// The following is an automatically generated require statement by the plugin,
// aimed to provide syntax/type errors to the IOpipe service.
// The original file is imported as text with capitalized tokens replaced.
try {
  handler = require('../RELATIVE_PATH');
} catch (err) {
  handlerError = err;
}

exports['EXPORT_NAME'] = function FUNCTION_NAME(event, context, callback) {
  try {
    return iopipe((evt, ctx, cb) => {
      if (handlerError) {
        return cb(handlerError);
      }
      return handler.METHOD(evt, ctx, cb);
    })(event, context, callback);
  } catch (err) {
    throw err;
  }
};
