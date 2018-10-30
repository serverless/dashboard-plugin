module.exports.handler = (event, context) => {
  if (!context.iopipe || !context.iopipe.mark) {
    return context.succeed(new Error('No plugins'));
  }
  return context.succeed(200);
};
