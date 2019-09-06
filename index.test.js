'use strict';

describe('index', () => {
  test('registers regeneratorRuntime', () => {
    global.regeneratorRuntime = undefined;
    require('./');
    expect(global.regeneratorRuntime).to.equal(require('regenerator-runtime'));
  });
});
