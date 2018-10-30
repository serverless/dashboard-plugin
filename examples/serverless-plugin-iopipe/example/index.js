module.exports.handler = (event, context) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hi from Lambda!',
      input: event
    })
  };
  context.succeed(response);
};
