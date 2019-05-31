import { entries, isEqual, pick } from 'lodash'
import fetch from 'isomorphic-fetch'
import { TestError } from './errors'

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
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
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
  if (testSpec.response.headers) {
    const pickedHeaders = pick(resp.headers._headers, Object.keys(testSpec.response.headers))
    if (!isEqual(testSpec.response.headers, pickedHeaders)) {
      throw new TestError('headers', testSpec.response.headers, pickedHeaders, resp, respBody)
    }
  } else if (testSpec.response === true && resp.status !== 200) {
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

export default runTest
