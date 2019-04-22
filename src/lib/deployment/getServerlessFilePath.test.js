import getServerlessFilePath from './getServerlessFilePath'
import fs from 'fs-extra'

jest.mock('fs-extra', () => ({
  lstat: jest.fn().mockReturnValue(Promise.resolve({ isFile: jest.fn().mockReturnValue(true) }))
}))

describe('getServerlessFilePath', () => {
  it('returns the serverless.yml first', async () => {
    const serverlessFilePath = await getServerlessFilePath('/foobar')
    expect(serverlessFilePath).toEqual('/foobar/serverless.yml')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.yml')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.yaml')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.json')
    expect(fs.lstat).toBeCalledWith('/foobar/serverless.js')
  })
})
