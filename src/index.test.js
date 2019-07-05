'use strict';

describe('index', () => {
  test('registers regeneratorRuntime', () => {
    jest.resetModules()
    global.regeneratorRuntime = undefined
    require('./')
    expect(global.regeneratorRuntime).toBe(require('regenerator-runtime'))
  })
})
