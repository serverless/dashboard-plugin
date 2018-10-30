exports.handler = (event, context) => {
  let body = { success: true };
  const params = event.queryStringParameters || {};
  const { fail } = params;
  if (!context.iopipe || fail) {
    body = { err: 'No iopipe object found on context' };
  }
  return context.succeed({
    statusCode: 200,
    body: JSON.stringify(body)
  });
};
