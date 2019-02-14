import parseDeploymentData from './parse'

describe('parseDeploymentData', () => {
  let getAccountId
  let request
  let getStackName
  let getServiceEndpointRegex

  beforeEach(() => {
    getAccountId = jest.fn()
    request = jest.fn().mockReturnValue(
      Promise.resolve({
        Stacks: [
          {
            Outputs: [
              {
                OutputKey: 'apig',
                OutputValue: 'https://api-id.execute.aws.amazon.com'
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
      version: '1.37.1',
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'dev', region: 'us-est-1' },
        layers: {},
        functions: {
          func: {
            handler: 'func.handler',
            events: [{ http: { path: '/', method: 'get' } }]
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
      }
    }
    const state = {
      safeguardsResults: [],
      secretsUsed: ['secret']
    }

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state })

    expect(deployment.get()).toEqual({
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      functions: {
        func: {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
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
          name: 'func',
          type: 'awsLambda'
        }
      },
      layers: {},
      plugins: [],
      provider: {
        custom: {
          accountId: undefined
        },
        environment: [],
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
          function: 'func',
          integration: undefined,
          method: 'get',
          path: '/',
          restApiId: 'api-id',
          type: 'http'
        }
      ],
      tenantName: 'tenant',
      tenantUid: 'txxx',
      versionEnterprisePlugin: '0.1.4',
      versionFramework: '1.37.1',
      versionSDK: '0.5.0'
    })
  })

  it('creates a deployment object correctly without http events', async () => {
    const serverless = {
      version: '1.37.1',
      service: {
        tenantUid: 'txxx',
        tenant: 'tenant',
        appUid: 'axxx',
        app: 'app',
        service: 'service',
        provider: { stage: 'dev', region: 'us-est-1' },
        layers: {},
        functions: { func: { handler: 'func.handler' } }
      }
    }
    const provider = {
      getAccountId,
      request,
      naming: {
        getStackName,
        getServiceEndpointRegex
      }
    }
    const state = {
      safeguardsResults: [],
      secretsUsed: ['secret']
    }

    const deployment = await parseDeploymentData({ sls: serverless, serverless, provider, state })

    expect(deployment.get()).toEqual({
      appName: 'app',
      appUid: 'axxx',
      archived: false,
      custom: {},
      error: null,
      functions: {
        func: {
          custom: {
            awsKmsKeyArn: undefined,
            environment: [],
            handler: 'func.handler',
            layers: [],
            memorySize: undefined,
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
          name: 'func',
          type: 'awsLambda'
        }
      },
      layers: {},
      plugins: [],
      provider: {
        custom: {
          accountId: undefined
        },
        environment: [],
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
      versionEnterprisePlugin: '0.1.4',
      versionFramework: '1.37.1',
      versionSDK: '0.5.0'
    })
  })
})
