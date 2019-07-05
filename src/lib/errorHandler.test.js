'use strict';

const errorHandler = require('./errorHandler')
const { parseDeploymentData } = require('./deployment')

jest.mock('./deployment', () => ({
  parseDeploymentData: jest
    .fn()
    .mockReturnValue(
      Promise.resolve({ save: jest.fn().mockReturnValue(Promise.resolve({ dashboardUrl: 'URL' })) })
    ),
}))

describe('errorHandler', () => {
  it('creates a depoyment with serialized error and saves it', async () => {
    const error = new Error('foobar')
    const ctx = { sls: { cli: { log: jest.fn() } }, state: {} }
    await errorHandler(ctx)(error)
    expect(parseDeploymentData).toBeCalledWith(ctx, 'error', {
      message: 'foobar',
      name: 'Error',
      stack: expect.any(String),
    })
    expect(ctx.sls.cli.log).toBeCalledWith(
      'Publishing service to the Enterprise Dashboard...',
      'Serverless Enterprise'
    )
    expect(ctx.sls.cli.log).toBeCalledWith(
      'Successfully published your service to the Enterprise Dashboard: URL',

      'Serverless Enterprise'
    )
  })
})
