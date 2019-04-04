const createEvent = require('aws-event-mocks')

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
      e = createEvent({
        template: 'aws:apiGateway',
        merge: {
          body: parsedBody
        }
      })
      break
    case 'sns':
      e = createEvent({
        template: 'aws:sns',
        merge: {
          Records: [
            {
              Sns: {
                Message: options.message
              }
            }
          ]
        }
      })
      break
    case 'sqs':
      e = createEvent({
        template: 'aws:sqs',
        merge: {
          Records: [
            {
              body: parsedBody
            }
          ]
        }
      })
      break
    default:
      throw new Error('Invalid event specified.')
  }
  // eslint-disable-next-line no-console
  return console.log(JSON.stringify(e))
}
