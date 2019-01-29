import updateDeploymentLocal from './updateDeployment'
import { updateDeployment, getAccessKeyForTenant, getServiceUrl } from '@serverless/platform-sdk'

jest.mock('@serverless/platform-sdk', () => ({
  getAccessKeyForTenant: jest.fn().mockReturnValue('accessKey'),
  getServiceUrl: jest.fn().mockReturnValue(Promise.resolve('http://example.com')),
  updateDeployment: jest.fn().mockReturnValue(Promise.resolve())
}))

describe('updateDeployment', () => {
  it('sends new deployments to the platform backend', async () => {
    const log = jest.fn()
    const getStackResources = jest.fn().mockReturnValue(Promise.resolve([]))
    const getAccountId = jest.fn().mockReturnValue(Promise.resolve('accountId'))
    const getStackName = jest.fn().mockReturnValue('stackName')
    const getServiceEndpointRegex = jest.fn().mockReturnValue('ServiceEndpoint')
    const request = jest.fn().mockReturnValue(
      Promise.resolve({
        Stacks: [
          {
            Outputs: [
              {
                OutputKey: 'ServiceEndpoint',
                OutputValue: 'https://API_ID.execute-api.sadfdsafafsaf'
              }
            ]
          }
        ]
      })
    )
    const ctx = {
      sls: {
        service: {
          tenant: 'tenantname',
          app: 'appname',
          service: 'servicename'
        },
        cli: { log }
      },
      provider: {
        getStackResources,
        getAccountId,
        request,
        naming: { getStackName, getServiceEndpointRegex }
      },
      state: {
        deployment: {
          deploymentId: 'deploymentId'
        }
      }
    }
    await updateDeploymentLocal(ctx)

    expect(log).toBeCalledWith(
      'Publishing service to the Enterprise Dashboard...',
      'Serverless Enterprise'
    )
    expect(getAccessKeyForTenant).toBeCalledWith('tenantname')
    expect(updateDeployment).toBeCalledWith({
      accessKey: 'accessKey',
      app: 'appname',
      computedData: {
        accountId: 'accountId',
        apiId: 'API_ID',
        physicalIds: []
      },
      deploymentId: 'deploymentId',
      serviceName: 'servicename',
      status: 'success',
      tenant: 'tenantname'
    })
    expect(getServiceUrl).toBeCalledWith({
      tenant: 'tenantname',
      app: 'appname',
      name: 'servicename'
    })
  })
})
