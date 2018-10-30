module.exports.handler = (event, context) => {
  if (!context.iopipe) {
    throw new Error('No iopipe');
  }
  context.succeed('Success');
};
