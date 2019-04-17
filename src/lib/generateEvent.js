import createEvent from '@serverless/event-mocks'

function recordWrapper(event) {
  return {
    Records: [event]
  }
}

function encodeBody(body) {
  if (body) {
    return Buffer.from(body).toString('base64')
  }
}
function wrapEvent(eventType, body) {
  const eventDict = {
    'aws:apiGateway': { body: body },
    'aws:sns': recordWrapper({ Sns: { Message: body } }),
    'aws:sqs': recordWrapper({ body: body }),
    'aws:dynamo': recordWrapper({ dynamodb: body }),
    'aws:kinesis': recordWrapper({
      kinesis: { data: encodeBody(body) }
    }),
    'aws:s3': {}
  }
  if (eventDict.hasOwnProperty(eventType)) {
    return createEvent(eventType, eventDict[eventType])
  }

  throw new Error('Invalid event specified.')
}

export default async function(ctx) {
  const { options } = ctx.sls.processedInput
  const e = wrapEvent(options.type, options.body)
  // eslint-disable-next-line no-console
  return console.log(JSON.stringify(e))
}
