describe('runtime.js', () => {
  test('it registers regeneratorRuntime', () => {
    jest.resetModules()
    global.regeneratorRuntime = undefined
    require('./runtime')
    expect(global.regeneratorRuntime).toBe(require('regenerator-runtime'))
  })
})
