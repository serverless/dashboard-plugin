import { entries, find, isEqual, values } from 'lodash'
import fetch from 'isomorphic-fetch'
import chalk from 'chalk'

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
  for (const func of values(ctx.sls.service.functions || {})) {
    for (const evt of func.events) {
      if (Object.keys(evt)[0] === 'http') {
        for (const testSpec of evt.http.tests || []) {
          try {
            const method = testSpec.method || evt.http.method
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
            process.stdout.write(`  running - ${testSpec.name}`)
            const resp = await fetch(`${baseApiUrl}/${evt.http.path}?${queryString}`, {
              method,
              body,
              headers
            })
            console.log(`${baseApiUrl}/${evt.http.path}?${queryString}`, {
              method,
              body,
              headers
            })
            if (testSpec.response === true && !resp.ok) {
              throw new Error(`response not ok`)
            } else if (testSpec.response) {
              if (testSpec.response.status && resp.status !== testSpec.response.status) {
                throw new Error(`status ${resp.status} != ${testSpec.response.status}`)
              }
              if (testSpec.response.body) {
                if (typeof testSpec.response.body === 'string') {
                  const respBody = await resp.text()
                  if (respBody !== testSpec.response.body) {
                    throw new Error(`body ${respBody} != ${testSpec.response.body}`)
                  }
                } else {
                  const respBody = await resp.json()
                  if (!isEqual(respBody, testSpec.response.body)) {
                    throw new Error(
                      `body ${JSON.stringify(respBody)} != ${JSON.stringify(
                        testSpec.response.body
                      )}`
                    )
                  }
                }
              }
            }
            process.stdout.write(`\r   ${chalk.green('passed')} - ${testSpec.name}\n`)
          } catch (err) {
            process.stdout.write(`\r   ${chalk.red('failed')} - ${testSpec.name}\n${err}`)
          }
          ctx.sls.cli.log(JSON.stringify(testSpec, null, 2))
        }
      }
    }
  }
}
