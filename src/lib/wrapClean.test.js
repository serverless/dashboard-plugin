'use strict';

const wrapClean = require('./wrapClean')
const fs = require('fs-extra')

jest.mock('fs-extra', () => ({
  pathExistsSync: jest.fn().mockReturnValue(true),
  removeSync: jest.fn(),
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
            entryNew: 's-func',
          },
        },
      },
    })

    expect(fs.pathExistsSync).toHaveBeenCalledTimes(2)
    expect(fs.removeSync).toHaveBeenCalledTimes(2)
    expect(fs.pathExistsSync).toBeCalledWith('/assets')
    expect(fs.pathExistsSync).toBeCalledWith('/service/s-func.js')
    expect(fs.removeSync).toBeCalledWith('/assets')
    expect(fs.removeSync).toBeCalledWith('/service/s-func.js')
  })
})
