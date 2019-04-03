const createEvent = require('aws-event-mocks')

export default async function(ctx) {
  const { options } = ctx.sls.processedInput
  let e
  switch (options.type) {
    case 'http':
      e = createEvent({
        template: 'aws:apiGateway',
        merge: {
          body: JSON.parse(options.body)
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
  }
  // eslint-disable-next-line no-console
  return console.log(JSON.stringify(e))
}
