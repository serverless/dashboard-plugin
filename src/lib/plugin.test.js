import ServerlessPlatformPlugin from './plugin'
import getCredentials from './credentials'
import awsApiGatewayLogsCollection from './awsApiGatewayLogsCollection'
import awsLambdaLogsCollection from './awsLambdaLogsCollection'
import wrap from './wrap.js'
import wrapClean from './wrapClean.js'
import runPolicies from './safeguards.js'
import removeDestination from './removeDestination.js'

afterAll(() => jest.restoreAllMocks())
jest.mock('./credentials', () => jest.fn())
jest.mock('./appUids', () =>
  jest.fn(() => ({ appUid: '000000000000000000', tenantUid: '000000000000000000' }))
)
jest.mock('./wrap', () => jest.fn())
jest.mock('./wrapClean', () => jest.fn())
jest.mock('./safeguards', () => jest.fn())
jest.mock('./awsApiGatewayLogsCollection', () => jest.fn())
jest.mock('./awsLambdaLogsCollection', () => jest.fn())
jest.mock('./removeDestination', () => jest.fn())

describe('plugin', () => {
  it('constructs and sets hooks', () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    expect(Object.keys(instance.hooks)).toEqual([
      'before:package:createDeploymentArtifacts',
      'after:package:createDeploymentArtifacts',
      'before:deploy:function:packageFunction',
      'before:invoke:local:invoke',
      'before:aws:package:finalize:saveServiceState',
      'before:deploy:deploy',
      'before:info:info',
      'before:logs:logs',
      'before:metrics:metrics',
      'before:remove:remove',
      'after:remove:remove',
      'after:invoke:local:invoke',
      'before:offline:start:init',
      'before:step-functions-offline:start'
    ])
    expect(getProviderMock).toBeCalledWith('aws')
    expect(logMock).toHaveBeenCalledTimes(0)
  })

  it('construct requires tennant', () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: {},
      cli: { log: logMock }
    })
    expect(Object.keys(instance.hooks)).toEqual([
      'before:package:createDeploymentArtifacts',
      'after:package:createDeploymentArtifacts',
      'before:deploy:function:packageFunction',
      'before:invoke:local:invoke',
      'before:aws:package:finalize:saveServiceState',
      'before:deploy:deploy',
      'before:info:info',
      'before:logs:logs',
      'before:metrics:metrics',
      'before:remove:remove',
      'after:remove:remove',
      'after:invoke:local:invoke',
      'before:offline:start:init',
      'before:step-functions-offline:start'
    ])
    expect(getProviderMock).toBeCalledWith('aws')
    expect(logMock).toBeCalledWith(
      'Warning: The Serverless Platform Plugin requires a "tenant"' +
        ', "app", "service" property in your "serverless.yml" and ' +
        'will not work without it.'
    )
  })

  it('routes before:package:createDeploymentArtifacts hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:package:createDeploymentArtifacts')()
    expect(wrap).toBeCalledWith(instance)
  })

  it('routes after:package:createDeploymentArtifacts hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('after:package:createDeploymentArtifacts')()
    expect(wrapClean).toBeCalledWith(instance)
  })

  it('routes before:invoke:local:invoke hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:invoke:local:invoke')()
    expect(wrap).toBeCalledWith(instance)
  })

  it('routes after:invoke:local:invoke hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('after:invoke:local:invoke')()
    expect(wrapClean).toBeCalledWith(instance)
  })

  it('routes before:info:info hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:info:info')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes before:logs:logs hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:logs:logs')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes before:metrics:metrics hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:metrics:metrics')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes before:remove:remove hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:remove:remove')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes after:remove:remove hook correctly', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('after:remove:remove')()
    expect(removeDestination).toBeCalledWith(instance)
  })

  it('routes before:aws:package:finalize:saveServiceState', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:aws:package:finalize:saveServiceState')()
    expect(getCredentials).toBeCalledWith(instance)
    expect(awsApiGatewayLogsCollection).toBeCalledWith(instance)
    expect(awsLambdaLogsCollection).toBeCalledWith(instance)
  })

  it('routes before:deploy:deploy', async () => {
    const getProviderMock = jest.fn()
    const logMock = jest.fn()
    const instance = new ServerlessPlatformPlugin({
      getProvider: getProviderMock,
      service: { service: 'service', app: 'app', tenant: 'tenant' },
      cli: { log: logMock }
    })
    await instance.route('before:deploy:deploy')()
    expect(runPolicies).toBeCalledWith(instance)
  })
})
