import ServerlessPlatformPlugin from '.'

describe('index', () => {
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
      'before:deploy:deploy',
      'before:info:info',
      'before:logs:logs',
      'before:metrics:metrics',
      'before:remove:remove',
      'after:invoke:local:invoke',
      'before:offline:start:init',
      'before:step-functions-offline:start'
    ])
    expect(getProviderMock).toBeCalledWith('aws')
    expect(logMock).toHaveBeenCalledTimes(0)
  })
})
