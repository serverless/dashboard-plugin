'use strict';

describe('index', () => {
  test('registers regeneratorRuntime', () => {
    global.regeneratorRuntime = undefined;
    require('./');
    expect(global.regeneratorRuntime).toBe(require('regenerator-runtime'));
  });
});
