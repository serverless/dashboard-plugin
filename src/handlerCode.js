let handler, handlerError
const util = require('util')

const writeFile = util.promisify(fs.writeFile)
// The following is an automatically generated require statement by the plugin,
// aimed to provide syntax/type errors to the IOpipe service.
// The original file is imported as text with capitalized tokens replaced.
try {
  handler = require('../RELATIVE_PATH')
} catch (err) {
  handlerError = err
}

if (!apm.isStarted()) {
  apm.start({
    serviceName: 'SERVICE_NAME',
    serverUrl: 'http://apm.signalmalt.com',
    logLevel: 'debug'
  })
}

// Better way to do this?
apm.addFilter(function(payload) {
  // the payload can either contain an array of transactions or errors
  var items = payload.transactions || payload.errors || []
  const serverless = {
    tenantId: 'TENANT_NAME',
    applicationName: 'APPLICATION_NAME',
    serviceName: 'SERVICE_NAME',
    region: 'REGION',
    provider: 'PROVIDER'
  }
  items.map((item) => {
    let functionName
    // strip out the app name (should strip out the stage too)
    if (item.context.custom.lambda.functionName.includes(serverless.applicationName)) {
      functionName = item.context.custom.lambda.functionName.slice(
        applicationName.length + 1,
        item.context.custom.lambda.functionName.length
      )
    } else {
      functionName = item.context.custom.lambda.functionName
    }

    item.context.tags = {
      ...item.context.tags,
      ...serverless,
      functionName
    }
    console.log(item.context.tags)
  })

  payload.service.name = 'SERVICE_NAME'

  return payload
})

const isPromise = (value) => value != null && typeof value.then === 'function'

exports['EXPORT_NAME'] = apm.lambda('PROVIDER-REGION', (evt, ctx, cb) => {
  const result = handler.METHOD(evt, ctx, cb)
  if (isPromise(result)) {
    return result.then((result) => cb(null, result)).catch((error) => cb(error))
  }
  return result
})
