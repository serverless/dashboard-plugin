'use strict';

const proxyquire = require('proxyquire');

describe('runtime.js', () => {
  test('it registers regeneratorRuntime', () => {
    global.regeneratorRuntime = undefined;
    proxyquire('./runtime', {}); // Ensure fresh require
    expect(global.regeneratorRuntime).to.equal(require('regenerator-runtime'));
  });
});
