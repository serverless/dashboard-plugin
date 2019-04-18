import { version as pluginVersion } from '../../../package.json'
import { version as sdkVersion } from '@serverless/platform-sdk/package.json'
import parseDeploymentData from './parse'

const frameworkVersion = '1.38.0'

jest.mock('./getServerlessFilePath', () =>
  jest.fn().mockReturnValue(Promise.resolve('serverless.yml'))
)
jest.mock('fs-extra', () => ({
  read: jest.fn().mockReturnValue(Promise.resolve('service: foobar'))
}))

describe('parseDeploymentData', () => {
  let getAccountId
  let request
  let getStackName
  let getServiceEndpointRegex

  beforeEach(() => {
    getAccountId = jest.fn().mockReturnValue('account-id')
    request = jest.fn().mockReturnValue(
      Promise.resolve({
        Stacks: [
          {
            Outputs: [
              {
                OutputKey: 'EnterpriseLogAccessIamRole',
                OutputValue: 'arn:aws:iam::111111111111:role/foobarRole'
              },
              {
                OutputKey: 'apig',
                OutputValue: 'https://api-id.execute.aws.amazon.com'
              },
              {
                OutputKey: 'apigWebsocket',
                OutputValue: 'wss://api-id.execute.aws.amazon.com'
              }
            ]
          }
        ]
      })
    )
    getStackName = jest.fn().mockReturnValue('stackname')
    getServiceEndpointRegex = jest.fn().mockReturnValue('apig')
  })

  it('creates a deployment object correctly', async () => {
    const serverless = {
      version: frameworkVersion,
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ http: { path: '/', method: 'get' } }, { schedule: 'rate(10 minutes)' }]
          }
        }
      }
    }
    const provider = {
      getAccountId,
      request,
      naming: {
        getStackName,
        getServiceEndpointRegex
      },
      getStage: jest.fn().mockReturnValue('dev'),
      getRegion: jest.fn().mockReturnValue('us-est-1')
    }
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret'])
    }

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state })

    expect(deployment.get()).toEqual({
      serverlessFile: 'service: foobar',
      serverlessFileName: 'serverless.yml',
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'service-dev-func': {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
            name: 'func',
            onError: undefined,
            role: undefined,
            runtime: undefined,
            tags: {},
            timeout: undefined,
            vpc: {
              securityGroupIds: [],
              subnetIds: []
            }
          },
          description: null,
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          type: 'awsLambda'
        }
      },
      layers: {},
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws'
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          cors: undefined,
          custom: {},
          function: 'service-dev-func',
          integration: undefined,
          method: 'get',
          path: '/',
          restApiId: 'api-id',
          type: 'http'
        },
        {
          custom: {},
          function: 'service-dev-func',
          schedule: 'rate(10 minutes)',
          type: 'schedule'
        }
      ],
      tenantName: 'tenant',
      tenantUid: 'txxx',
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: sdkVersion
    })
  })

  it('creates a deployment object correctly with zeroconf alexaSkill', async () => {
    const serverless = {
      version: frameworkVersion,
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: ['alexaSkill']
          }
        }
      }
    }
    const provider = {
      getAccountId,
      request,
      naming: {
        getStackName,
        getServiceEndpointRegex
      },
      getStage: jest.fn().mockReturnValue('dev'),
      getRegion: jest.fn().mockReturnValue('us-est-1')
    }
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret'])
    }

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state })

    expect(deployment.get()).toEqual({
      serverlessFile: 'service: foobar',
      serverlessFileName: 'serverless.yml',
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'service-dev-func': {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
            name: 'func',
            onError: undefined,
            role: undefined,
            runtime: undefined,
            tags: {},
            timeout: undefined,
            vpc: {
              securityGroupIds: [],
              subnetIds: []
            }
          },
          description: null,
          name: 'service-dev-func',
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          type: 'awsLambda'
        }
      },
      layers: {},
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws'
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          custom: {},
          function: 'service-dev-func',
          type: 'alexaSkill'
        }
      ],
      tenantName: 'tenant',
      tenantUid: 'txxx',
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: sdkVersion
    })
  })

  it('creates a deployment object correctly with websocket', async () => {
    const serverless = {
      version: frameworkVersion,
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ websocket: { route: '$connect' } }, { schedule: 'rate(10 minutes)' }]
          }
        }
      }
    }
    const provider = {
      getAccountId,
      request,
      naming: {
        getStackName,
        getServiceEndpointRegex
      },
      getStage: jest.fn().mockReturnValue('dev'),
      getRegion: jest.fn().mockReturnValue('us-est-1')
    }
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret'])
    }

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state })

    expect(deployment.get()).toEqual({
      serverlessFile: 'service: foobar',
      serverlessFileName: 'serverless.yml',
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'service-dev-func': {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
            name: 'func',
            onError: undefined,
            role: undefined,
            runtime: undefined,
            tags: {},
            timeout: undefined,
            vpc: {
              securityGroupIds: [],
              subnetIds: []
            }
          },
          description: null,
          arn: 'arn:aws:lambda:us-est-1:account-id:function:service-dev-func',
          name: 'service-dev-func',
          type: 'awsLambda'
        }
      },
      layers: {},
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws'
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [
        {
          custom: {},
          function: 'service-dev-func',
          type: 'websocket',
          websocketApiId: 'api-id',
          route: '$connect'
        },
        {
          custom: {},
          function: 'service-dev-func',
          schedule: 'rate(10 minutes)',
          type: 'schedule'
        }
      ],
      tenantName: 'tenant',
      tenantUid: 'txxx',
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: sdkVersion
    })
  })

  it('creates a deployment object correctly without http events', async () => {
    const serverless = {
      version: frameworkVersion,
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'prod', region: 'us-est-2' },
        layers: {},
        functions: { func: { handler: 'func.handler', name: 'func-custom' } }
      }
    }
    const provider = {
      getAccountId,
      request,
      naming: {
        getStackName,
        getServiceEndpointRegex
      },
      getStage: jest.fn().mockReturnValue('dev'),
      getRegion: jest.fn().mockReturnValue('us-est-1')
    }
    const state = {
      safeguardsResults: [],
      secretsUsed: new Set(['secret'])
    }

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state })

    expect(deployment.get()).toEqual({
      serverlessFile: 'service: foobar',
      serverlessFileName: 'serverless.yml',
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      logsRoleArn: 'arn:aws:iam::111111111111:role/foobarRole',
      functions: {
        'func-custom': {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
            name: 'func-custom',
            onError: undefined,
            role: undefined,
            runtime: undefined,
            tags: {},
            timeout: undefined,
            vpc: {
              securityGroupIds: [],
              subnetIds: []
            }
          },
          description: null,
          arn: 'arn:aws:lambda:us-est-1:account-id:function:func-custom',
          name: 'func-custom',
          type: 'awsLambda'
        }
      },
      layers: {},
      plugins: [],
      provider: {
        aws: { accountId: 'account-id' },
        type: 'aws'
      },
      regionName: 'us-est-1',
      resources: {},
      safeguards: [],
      secrets: ['secret'],
      serviceName: 'service',
      stageName: 'dev',
      status: 'success',
      subscriptions: [],
      tenantName: 'tenant',
      tenantUid: 'txxx',
      versionEnterprisePlugin: pluginVersion,
      versionFramework: frameworkVersion,
      versionSDK: sdkVersion
    })
  })
})
