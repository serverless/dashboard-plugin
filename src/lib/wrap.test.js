import fs from 'fs-extra'
import wrap from './wrap'

afterAll(() => jest.restoreAllMocks())
jest.mock('fs-extra', () => ({
  writeFileSync: jest.fn(),
  pathExistsSync: jest.fn().mockReturnValue(true),
  removeSync: jest.fn(),
  ensureDirSync: jest.fn(),
  copySync: jest.fn()
}))

describe('wrap - wrap', () => {
  it('wraps copies js sdk & calls wrapper', async () => {
    const log = jest.fn()

    const ctx = {
      state: {},
      sls: {
        config: { servicePath: 'path' },
        service: {
          service: 'service',
          tenant: 'tenant',
          app: 'app',
          appUid: 'appUid',
          provider: { stage: 'dev' },
          functions: {
            func: {
              runtime: 'nodejs8.10',
              handler: 'handlerFile.handlerFunc'
            }
          }
        },
        cli: { log }
      }
    }
    await wrap(ctx)

    expect(fs.pathExistsSync).toBeCalledWith('path/serverless-sdk')
    expect(ctx.state.functions).toEqual({
      func: {
        entryNew: 's-func',
        entryOrig: 'handlerFile',
        handlerNew: 'handler',
        handlerOrig: 'handlerFunc',
        key: 'func',
        name: 'service-dev-func',
        runtime: 'nodejs8.10'
      }
    })
    expect(fs.writeFileSync).toBeCalledWith(
      'path/s-func.js',
      `var serverlessSDK = require('./serverless-sdk/index.js')
serverlessSDK = new serverlessSDK({
tenantId: 'tenant',
applicationName: 'app',
appUid: 'appUid',
serviceName: 'service',
stageName: 'dev'})
module.exports.handler = serverlessSDK.handler(require('./handlerFile.js').handlerFunc, { functionName: 'service-dev-func' })`
    )
  })
})
