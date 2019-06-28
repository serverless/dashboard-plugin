import chalk from 'chalk'
import ServerlessEnterprisePlugin from './plugin'
import getCredentials from './credentials'
import logsCollection from './logsCollection'
import wrap from './wrap'
import wrapClean from './wrapClean'
import runPolicies from './safeguards'
import removeDestination from './removeDestination'
import { saveDeployment } from './deployment'
import { generate } from './generateEvent'
import { configureDeployProfile } from './deployProfile'
import injectLogsIamRole from './injectLogsIamRole'
import _ from 'lodash'

afterAll(() => jest.restoreAllMocks())

// REMOVING GETPROVIDREMOCK() AND LOGMOCK() AND USING THESLS INSTANCE BELOW

// Mock Serverless Instance
const sls = {
  getProvider: jest.fn().mockReturnValue({
    getStage: jest.fn().mockReturnValue('stage'),
    getRegion: jest.fn().mockReturnValue('region')
  }),
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
    commands: [],
    options: {
      type: 'sqs'
    }
  }
}

jest.spyOn(global.console, 'log')

// Mock SDK
jest.mock('@serverless/platform-sdk', () => ({
  configureFetchDefaults: jest.fn(),
  getLoggedInUser: jest.fn().mockReturnValue({
    accessKeys: {
      tenant: '12345'
    },
    idToken: 'ID'
  }),
  getAccessKeyForTenant: jest.fn().mockReturnValue('123456'),
  archiveService: jest.fn().mockImplementation(() => Promise.resolve()),
  getMetadata: jest.fn().mockReturnValue(Promise.resolve('token')),
  urls: { frontendUrl: 'https://dashboard/' }
}))

jest.mock('./credentials', () => jest.fn())
jest.mock('./appUids', () =>
  jest.fn(() => ({ appUid: '000000000000000000', tenantUid: '000000000000000000' }))
)
jest.mock('./wrap', () => jest.fn())
jest.mock('./wrapClean', () => jest.fn())
jest.mock('./safeguards', () => jest.fn())
jest.mock('./logsCollection', () => jest.fn())
jest.mock('./removeDestination', () => jest.fn())
jest.mock('./deployment', () => ({ saveDeployment: jest.fn() }))
jest.mock('./variables', () => ({ hookIntoVariableGetter: jest.fn() }))
jest.mock('./generateEvent', () => ({ eventDict: {}, generate: jest.fn() }))
jest.mock('./injectLogsIamRole', () => jest.fn())
jest.mock('./deployProfile', () => ({ configureDeployProfile: jest.fn() }))

describe('plugin', () => {
  it('constructs and sets hooks', () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    expect(Object.keys(instance.hooks)).toEqual([
      'before:package:createDeploymentArtifacts',
      'after:package:createDeploymentArtifacts',
      'before:deploy:function:packageFunction',
      'after:deploy:function:packageFunction',
      'before:invoke:local:invoke',
      'before:aws:package:finalize:saveServiceState',
      'before:deploy:deploy',
      'before:aws:deploy:deploy:createStack',
      'after:aws:deploy:finalize:cleanup',
      'after:deploy:finalize',
      'after:deploy:deploy',
      'before:info:info',
      'after:info:info',
      'before:logs:logs',
      'before:metrics:metrics',
      'before:remove:remove',
      'after:remove:remove',
      'after:invoke:local:invoke',
      'before:offline:start:init',
      'before:step-functions-offline:start',
      'login:login',
      'logout:logout',
      'generate-event:generate-event',
      'test:test',
      'dashboard:dashboard'
    ])
    expect(sls.getProvider).toBeCalledWith('aws')
    expect(sls.cli.log).toHaveBeenCalledTimes(0)
  })

  it('construct requires tenant', () => {
    const slsClone = _.cloneDeep(sls)
    delete slsClone.service.tenant
    const instance = new ServerlessEnterprisePlugin(slsClone) // eslint-disable-line
    expect(slsClone.getProvider).toBeCalledWith('aws')
    expect(sls.cli.log).toHaveBeenCalledTimes(0)
  })

  it('routes before:package:createDeploymentArtifacts hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:package:createDeploymentArtifacts')()
    expect(wrap).toBeCalledWith(instance)
    expect(injectLogsIamRole).toBeCalledWith(instance)
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

  it('routes after:aws:deploy:finalize:cleanup hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('after:aws:deploy:finalize:cleanup')()
    expect(saveDeployment).toBeCalledWith(instance)
  })

  it('routes after:remove:remove hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('after:remove:remove')()
    expect(removeDestination).toBeCalledWith(instance)
    expect(saveDeployment).toBeCalledWith(instance, true)
  })

  it('routes before:aws:package:finalize:saveServiceState', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:aws:package:finalize:saveServiceState')()
    expect(getCredentials).toBeCalledWith(instance)
    expect(logsCollection).toBeCalledWith(instance)
  })

  it('routes before:deploy:deploy', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('before:deploy:deploy')()
    expect(runPolicies).toBeCalledWith(instance)
  })

  it('routes generate-event:generate-event hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('generate-event:generate-event')()
    expect(generate).toBeCalledWith(instance)
  })

  it('it calls deploy profile config in async initializer', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.asyncInit()
    expect(configureDeployProfile).toBeCalledWith(instance)
  })

  it('routes after:info:info hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls)
    await instance.route('after:info:info')()
    // eslint-disable-next-line no-console
    expect(console.log).toBeCalledWith(
      chalk.yellow(
        'Run "serverless dashboard" to open the dashboard or visit https://dashboard/tenants/tenant/applications/app/services/service/stage/stage/region/region'
      )
    )
  })
})
