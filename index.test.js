'use strict';

describe('index', () => {
  test('registers regeneratorRuntime', () => {
    jest.resetModules();
    global.regeneratorRuntime = undefined;
    require('./index');
    expect(global.regeneratorRuntime).toBe(require('regenerator-runtime'));
  });
});
