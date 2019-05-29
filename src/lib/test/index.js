import { entries, find, isEqual, values } from 'lodash'
import fetch from 'isomorphic-fetch'
import chalk from 'chalk'

class TestError extends Error {
  constructor(field, expected, recieved, resp) {
    super('Test failed, expected: ${expected}, recieved: ${recieved}')
    Object.assign(this, { field, expected, recieved, resp })
  }
}

const runTest = async (evt, testSpec, testName, method, baseApiUrl) => {
  let body
  const headers = {}
  let queryString = ''
  if (testSpec.request.body) {
    if (typeof testSpec.request.body === 'string') {
      ;({ body } = testSpec.request)
    } else {
      body = JSON.stringify(testSpec.request.body)
      headers['Content-Type'] = 'application/json'
    }
  } else if (testSpec.request.form) {
    queryString = entries(testSpec.request.form)
      .map((key, value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
  }
  if (testSpec.request.headers) {
    Object.assign(headers, testSpec.request.headers)
  }
  process.stdout.write(`  running - ${testName}`)
  const resp = await fetch(`${baseApiUrl}/${evt.http.path}?${queryString}`, {
    method,
    body,
    headers
  })
  const respCopy = resp.clone() // so that we can re-use .text() if errors occur
  if (testSpec.response === true && resp.status !== 200) {
    throw new TestError('status', 200, resp.status, respCopy)
  } else if (testSpec.response) {
    if (testSpec.response.status && resp.status !== testSpec.response.status) {
      throw new TestError('status', testSpec.response.status, resp.status, respCopy)
    }
    if (testSpec.response.body) {
      if (typeof testSpec.response.body === 'string') {
        const text = await resp.text()
        if (text !== testSpec.response.body) {
          throw new TestError('body', testSpec.response.body, text, respCopy)
        }
      } else {
        const json = await resp.json()
        if (!isEqual(json, testSpec.response.body)) {
          throw new TestError('body', testSpec.response.body, json, respCopy)
        }
      }
    }
  }
}

export const test = async (ctx) => {
  const cfnStack = await ctx.provider.request('CloudFormation', 'describeStacks', {
    StackName: ctx.provider.naming.getStackName()
  })
  const apigResource = find(
    cfnStack.Stacks[0].Outputs,
    ({ OutputKey }) =>
      !OutputKey.endsWith('Websocket') &&
      OutputKey.match(ctx.provider.naming.getServiceEndpointRegex())
  )
  const apiId = apigResource && apigResource.OutputValue.split('https://')[1].split('.')[0]
  const baseApiUrl = `https://${apiId}.execute-api.${ctx.provider.getRegion()}.amazonaws.com/${ctx.provider.getStage()}`

  ctx.sls.cli.log(
    `Test Results:

   Summary --------------------------------------------------
`,
    `Serverless Enterprise`
  )

  const errors = []
  let numTests = 0

  for (const func of values(ctx.sls.service.functions || {})) {
    for (const evt of func.events) {
      if (Object.keys(evt)[0] === 'http') {
        for (const testSpec of evt.http.tests || []) {
          const method = testSpec.method || evt.http.method
          const testName = `${method.toUpperCase()} ${evt.http.path} - ${testSpec.name}`
          try {
            numTests += 1
            await runTest(evt, testSpec, testName, method, baseApiUrl)
            process.stdout.write(`\r   ${chalk.green('passed')} - ${testName}\n`)
          } catch (error) {
            errors.push({ testSpec, error })
            process.stdout.write(`\r   ${chalk.red('failed')} - ${testName}\n`)
          }
        }
      }
    }
  }
  process.stdout.write('\n')
  if (errors.length > 0) {
    process.stdout.write(
      `   ${chalk.yellow('Details --------------------------------------------------')}\n\n`
    )

    for (let i = 0; i < errors.length; i++) {
      const { error, testSpec } = errors[i]
      const body = await error.resp.text()
      const { headers, status } = error.resp
      process.stdout.write(`   ${i + 1}) ${chalk.red(`Failed -  ${testSpec.name}`)}\n`)
      const info = `      status: ${status}
      headers:
    ${entries(headers._headers)
      .map(([key, value]) => `    ${key}: ${value}`)
      .join('\n')
      .replace(/\n/g, '\n    ')}
      body: ${body}`
      process.stdout.write(chalk.grey(info))

      const expectedAndRecieved = `
      expected: ${error.field} = ${
        typeof error.expected === 'object'
          ? JSON.stringify(error.expected, null, 2).replace(/\n/g, '\n      ')
          : error.expected
      }
      recieved: ${error.field} = ${
        typeof error.recieved === 'object'
          ? JSON.stringify(error.recieved, null, 2).replace(/\n/g, '\n      ')
          : error.recieved
      }\n\n`
      process.stdout.write('\n' + chalk.white(expectedAndRecieved))
    }
  }

  const passed = chalk.green(`${numTests - errors.length} passed`)
  const failed = chalk.red(`${errors.length} failed`)
  ctx.sls.cli.log(`Test Summary: ${passed}, ${failed}`, 'Serverless Enterprise')
}
