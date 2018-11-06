let handler, handlerError

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

// exports['EXPORT_NAME'] = function FUNCTION_NAME(event, context, callback) {
//   try {
//     return apm.lambda('PROVIDER-REGION', (evt, ctx, cb) => {
//       if (handlerError) {
//         return cb(handlerError)
//       }
//       return handler.METHOD(evt, ctx, cb)
//     })(event, context, callback)
//   } catch (err) {
//     throw err
//   }
// }

exports['EXPORT_NAME'] = apm.lambda('PROVIDER-REGION', (evt, ctx, cb) => {
  try {
    const result = handler.METHOD(evt, ctx, cb)
    console.log(typeof result)
    if (isPromise(result)) {
      console.log('inside promise', result)
      return result
        .then((value) => {
          console.log('this is the cb', cb)
          console.log('calling cb with', value)
          cb(null, value)
        })
        .catch((error) => cb(error))
    }
  } catch (err) {
    console.log('in the error', err)
    throw err
  }
  return result
})
