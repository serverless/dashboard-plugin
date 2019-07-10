const getServerlessFilePath = require('./getServerlessFilePath')
const fs = require('fs-extra')

jest.mock('fs-extra', () => ({
  lstat: jest.fn().mockReturnValue(Promise.resolve({ isFile: jest.fn().mockReturnValue(true) }))
}))

describe('getServerlessFilePath', () => {
  it('returns the serverless.yml first', async () => {
    const serverlessFilePath = await getServerlessFilePath(undefined, '/foobar')
    expect(serverlessFilePath).toEqual('/foobar/serverless.yml')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.yml')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.yaml')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.json')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.js')
  })

  it('returns the custom.yml first', async () => {
    const serverlessFilePath = await getServerlessFilePath('custom.yml', '/foobar')
    expect(serverlessFilePath).toEqual('/foobar/custom.yml')
    expect(fs.lstat).toBeCalledWith('/foobar/custom.yml')
  })
})
