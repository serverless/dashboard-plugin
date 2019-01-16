import { removeLogDestination } from '@serverless/platform-sdk'
import removeDestination from './removeDestination'

jest.mock('@serverless/platform-sdk', () => ({ removeLogDestination: jest.fn() }))
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
          getServiceName,
          custom: { enterprise: { collectLambdaLogs: true } }
        }
      },
      provider: { getStage, getRegion }
    })

    expect(removeLogDestination).toBeCalledWith({
      appUid: 'UID',
      serviceName: 'service',
      stageName: 'stage',
      regionName: 'region'
    })
  })
})
