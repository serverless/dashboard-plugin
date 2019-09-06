'use strict';

describe('runtime.js', () => {
  test('it registers regeneratorRuntime', () => {
    global.regeneratorRuntime = undefined;
    require('./runtime');
    expect(global.regeneratorRuntime).toBe(require('regenerator-runtime'));
  });
});
