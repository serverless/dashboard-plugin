import ServerlessEnterprisePlugin from './plugin'
import sdk from '@serverless/platform-sdk'
import getCredentials from './credentials'
import awsApiGatewayLogsCollection from './awsApiGatewayLogsCollection'
import awsLambdaLogsCollection from './awsLambdaLogsCollection'
import wrap from './wrap'
import wrapClean from './wrapClean'
import runPolicies from './safeguards'
import removeDestination from './removeDestination'

afterAll(() => jest.restoreAllMocks())


// REMOVING GETPROVIDREMOCK() AND LOGMOCK() AND USING THESLS INSTANCE BELOW


// Mock Serverless Instance
const sls = {
  getProvider: jest.fn(),
  service: {
    service: 'service',
    app: 'app',
    tenant: 'tenant',
    provider: {}
  },
  cli: {
    log: jest.fn()
  },
  processedInput: {
    commands: []
  }
}

// Mock SDK
jest.mock('@serverless/platform-sdk', () => ({
  getLoggedInUser: jest.fn().mockReturnValue({
    accessKeys: {
      tenant: '12345'
    },
    idToken: 'ID',
  }),
  getAccessKeyForTenant: jest.fn().mockReturnValue('123456'),
  archiveService: jest.fn().mockImplementation(() => Promise.resolve())
}))

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
    const instance = new ServerlessEnterprisePlugin(sls)
    expect(Object.keys(instance.hooks)).toEqual([
      'before:package:createDeploymentArtifacts',
      'after:package:createDeploymentArtifacts',
      'before:deploy:function:packageFunction',
      'before:invoke:local:invoke',
      'before:aws:package:finalize:saveServiceState',
      'before:deploy:deploy',
      'before:aws:deploy:finalize:cleanup',
      'after:deploy:finalize',
      'after:deploy:deploy',
      'before:info:info',
      'before:logs:logs',
      'before:metrics:metrics',
      'before:remove:remove',
      'after:remove:remove',
      'after:invoke:local:invoke',
      'before:offline:start:init',
      'before:step-functions-offline:start',
      'login:login',
      'logout:logout',
    ])
    expect(sls.getProvider).toBeCalledWith('aws')
    expect(sls.cli.log).toHaveBeenCalledTimes(0)
  })

  it('construct requires tenant', () => {
    let slsClone = Object.assign({}, sls)
    delete slsClone.service.tenant
    const instance = new ServerlessEnterprisePlugin(slsClone)
    expect(sls.getProvider).toBeCalledWith('aws')
    expect(sls.cli.log).toBeCalledWith(
      "Warning: The Enterprise Plugin requires a \"tenant\" property in your \"serverless.yml\" and will not work without it.",
      "Serverless Enterprise"
    )
  })

  it('routes before:package:createDeploymentArtifacts hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:package:createDeploymentArtifacts')()
    expect(wrap).toBeCalledWith(instance)
  })

  it('routes after:package:createDeploymentArtifacts hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('after:package:createDeploymentArtifacts')()
    expect(wrapClean).toBeCalledWith(instance)
  })

  it('routes before:invoke:local:invoke hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:invoke:local:invoke')()
    expect(wrap).toBeCalledWith(instance)
  })

  it('routes after:invoke:local:invoke hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('after:invoke:local:invoke')()
    expect(wrapClean).toBeCalledWith(instance)
  })

  it('routes before:info:info hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:info:info')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes before:logs:logs hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:logs:logs')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes before:metrics:metrics hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:metrics:metrics')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes before:remove:remove hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:remove:remove')()
    expect(getCredentials).toBeCalledWith(instance)
  })

  it('routes after:remove:remove hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('after:remove:remove')()
    expect(removeDestination).toBeCalledWith(instance)
  })

  it('routes before:aws:package:finalize:saveServiceState', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:aws:package:finalize:saveServiceState')()
    expect(getCredentials).toBeCalledWith(instance)
    expect(awsApiGatewayLogsCollection).toBeCalledWith(instance)
    expect(awsLambdaLogsCollection).toBeCalledWith(instance)
  })

  it('routes before:deploy:deploy', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:deploy:deploy')()
    expect(runPolicies).toBeCalledWith(instance)
  })
})
