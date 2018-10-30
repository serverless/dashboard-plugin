const uuid = require('uuid');

module.exports.handler = (event, context) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `Your uuid is: ${uuid.v4()}`,
      input: event
    })
  };
  context.succeed(response);
};
