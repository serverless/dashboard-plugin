import { entries, find, isEqual } from 'lodash'
import fetch from 'isomorphic-fetch'
import fse from 'fs-extra'
import chalk from 'chalk'
import yaml from 'js-yaml'

class TestError extends Error {
  constructor(field, expected, recieved, resp, body) {
    super('Test failed, expected: ${expected}, recieved: ${recieved}')
    Object.assign(this, { field, expected, recieved, resp, body })
  }
}

const runTest = async (testSpec, path, method, baseApiUrl) => {
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
  const resp = await fetch(`${baseApiUrl}/${path}?${queryString}`, {
    method,
    body,
    headers
  })
  const respBody = await resp.text()
  if (testSpec.response === true && resp.status !== 200) {
    throw new TestError('status', 200, resp.status, resp, respBody)
  } else if (testSpec.response) {
    if (testSpec.response.status && resp.status !== testSpec.response.status) {
      throw new TestError('status', testSpec.response.status, resp.status, resp, respBody)
    }
    if (testSpec.response.body) {
      if (typeof testSpec.response.body === 'string') {
        if (respBody !== testSpec.response.body) {
          throw new TestError('body', testSpec.response.body, respBody, resp, respBody)
        }
      } else {
        const json = JSON.parse(respBody)
        if (!isEqual(json, testSpec.response.body)) {
          throw new TestError('body', testSpec.response.body, json, resp, respBody)
        }
      }
    }
  }
}

export const test = async (ctx) => {
  if (!fse.exists('serverless.test.yml')) {
    ctx.sls.cli.log(`No serverless.test.yml file found`, `Serverless Enterprise`)
    return
  }
  let tests = yaml.safeLoad(await fse.readFile('serverless.test.yml'))

  const { options } = ctx.sls.processedInput
  if (options.function) {
    tests = tests.filter(({ endpoint }) => endpoint.function === options.function)
  }
  if (options.test) {
    tests = tests.filter(({ name }) => name === options.test)
  }

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

  const funcs = ctx.sls.service.functions || {}
  for (const testSpec of tests || []) {
    const method =
      testSpec.endpoint.method || funcs[testSpec.endpoint.function].events[0].http.method
    const path = testSpec.endpoint.path || funcs[testSpec.endpoint.function].events[0].http.path
    const testName = `${method.toUpperCase()} ${path} - ${testSpec.name}`
    try {
      numTests += 1
      process.stdout.write(`  running - ${testName}`)
      await runTest(testSpec, path, method, baseApiUrl)
      process.stdout.write(`\r   ${chalk.green('passed')} - ${testName}\n`)
    } catch (error) {
      errors.push({ testSpec, error })
      process.stdout.write(`\r   ${chalk.red('failed')} - ${testName}\n`)
    }
  }
  process.stdout.write('\n')
  if (errors.length > 0) {
    process.stdout.write(
      `   ${chalk.yellow('Details --------------------------------------------------')}\n\n`
    )

    for (let i = 0; i < errors.length; i++) {
      const { error, testSpec } = errors[i]
      const { headers, status } = error.resp
      process.stdout.write(`   ${i + 1}) ${chalk.red(`Failed -  ${testSpec.name}`)}\n`)
      const info = `      status: ${status}
      headers:
    ${entries(headers._headers)
      .map(([key, value]) => `    ${key}: ${value}`)
      .join('\n')
      .replace(/\n/g, '\n    ')}
      body: ${error.body}`
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
