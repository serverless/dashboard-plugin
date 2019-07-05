const { getAccessKeyForTenant, removeLogDestination } = require('@serverless/platform-sdk')
const removeDestination = require('./removeDestination')

jest.mock('@serverless/platform-sdk', () => ({
  removeLogDestination: jest.fn(),
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey')),
}))
afterAll(() => jest.restoreAllMocks())

describe('removeDestination', () => {
  it('calls the sdk method to remove log destinations', async () => {
    const getServiceName = jest.fn().mockReturnValue('service')
    const getRegion = jest.fn().mockReturnValue('region')
    const getStage = jest.fn().mockReturnValue('stage')

    await removeDestination({
      sls: {
        service: {
          appUid: 'UID',
          tenant: 'tenant',
          getServiceName,
          custom: { enterprise: { collectLambdaLogs: true } },
        },
      },
      provider: { getStage, getRegion },
    })

    expect(getAccessKeyForTenant).toBeCalledWith('tenant')
    expect(removeLogDestination).toBeCalledWith({
      appUid: 'UID',
      serviceName: 'service',
      stageName: 'stage',
      regionName: 'region',
      accessKey: 'accessKey',
    })
  })
})
