import createEvent from '@serverless/event-mocks'
import zlib from 'zlib'

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

async function gzipBody(body) {
  return new Promise((res, rej) => {
    zlib.gzip(body, function(error, result) {
      if (error) {
        return rej(error)
      }
      res(result)
    })
  })
}

function parsedBody(body) {
  return JSON.parse(body)
}

async function wrapEvent(eventType, body) {
  const eventDict = {
    'aws:apiGateway': () => ({ body: body }),
    'aws:websocket': () => ({ body: body }),
    'aws:sns': () => recordWrapper({ Sns: { Message: body } }),
    'aws:sqs': () => recordWrapper({ body: body }),
    'aws:dynamo': () => recordWrapper({ dynamodb: body }),
    'aws:kinesis': () =>
      recordWrapper({
        kinesis: { data: encodeBody(body) }
      }),
    'aws:cloudWatchLog': async () => ({
      awslogs: { data: encodeBody(await gzipBody(body)) }
    }),
    'aws:s3': () => ({}),
    'aws:alexaSmartHome': () => parsedBody(body),
    'aws:alexaSkill': () => parsedBody(body),
    'aws:cloudWatch': () => parsedBody(body),
    'aws:iot': () => parsedBody(body),
    'aws:cognitoUserPool': () => parsedBody(body),
    'aws:websocket': () => ({ body: body })
  }
  if (eventDict.hasOwnProperty(eventType)) {
    return createEvent(eventType, await eventDict[eventType]())
  }

  throw new Error('Invalid event specified.')
}

export default async function(ctx) {
  const { options } = ctx.sls.processedInput
  const body = options.body === undefined ? '{}' : options.body
  const e = await wrapEvent(options.type, body)
  // eslint-disable-next-line no-console
  return console.log(JSON.stringify(e))
}
