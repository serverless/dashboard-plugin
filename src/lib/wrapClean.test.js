import wrapClean from './wrapClean'
import fs from 'fs-extra'

jest.mock('fs-extra', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  removeSync: jest.fn()
}))

afterAll(() => jest.restoreAllMocks())

describe('wrapClean', () => {
  it('deletes wrapper files', async () => {
    wrapClean({
      sls: { config: { servicePath: '/service' } },
      state: {
        pathAssets: '/assets',
        functions: {
          func: {
            runtime: 'nodejs8.10',
            entryNew: 's-func'
          }
        }
      }
    })

    expect(fs.existsSync).toHaveBeenCalledTimes(2)
    expect(fs.removeSync).toHaveBeenCalledTimes(2)
    expect(fs.existsSync).toBeCalledWith('/assets')
    expect(fs.existsSync).toBeCalledWith('/service/s-func.js')
    expect(fs.removeSync).toBeCalledWith('/assets')
    expect(fs.removeSync).toBeCalledWith('/service/s-func.js')
  })
})
