import createEvent from '@serverless/event-mocks'

export default async function(ctx) {
  const { options } = ctx.sls.processedInput
  let e, parsedBody
  if (options.body) {
    try {
      parsedBody = JSON.parse(options.body)
    } catch (error) {
      parsedBody = {}
    }
  }
  switch (options.type) {
    case 'http':
      e = createEvent('aws:apiGateway', { body: parsedBody })
      break
    case 'sns':
      e = createEvent('aws:sns', {
        Records: [
          {
            Sns: {
              Message: options.message
            }
          }
        ]
      })
      break
    case 'sqs':
      e = createEvent('aws:sqs', {
        Records: [
          {
            body: parsedBody
          }
        ]
      })
      break
    case 'dynamodb':
      e = createEvent('aws:dynamo', {
        Records: [
          {
            dynamodb: parsedBody
          }
        ]
      })
      break
    default:
      throw new Error('Invalid event specified.')
  }
  // eslint-disable-next-line no-console
  return console.log(JSON.stringify(e))
}
