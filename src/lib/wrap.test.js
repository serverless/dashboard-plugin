import fs from 'fs-extra'
import { wrapNodeJs } from './wrap'

afterAll(() => jest.restoreAllMocks())
jest.mock('fs-extra', () => ({
  writeFileSync: jest.fn()
}))

describe('wrap - wrapNodeJs', () => {
  it('wraps nodejs handlers', () => {
    wrapNodeJs(
      {
        name: 'name',
        entryOrig: 'file',
        handlerOrig: 'func',
        entryNew: 's-fn'
      },
      {
        sls: {
          config: { servicePath: 'path' },
          service: {
            service: 'service',
            tenant: 'tenant',
            app: 'app',
            provider: { stage: 'dev' }
          }
        }
      }
    )

    expect(fs.writeFileSync).toBeCalledWith(
      'path/s-fn.js',
      `var serverlessSDK = require('./serverless-sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: 'tenant',
applicationName: 'app',
serviceName: 'service',
stageName: 'dev'})
module.exports.handler = serverlessSDK.handler(require('./file.js').func, { functionName: 'name' })`
    )
  })
})
