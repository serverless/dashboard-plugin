'use strict';

const proxyquire = require('proxyquire');

describe('index', () => {
  test('registers regeneratorRuntime', () => {
    global.regeneratorRuntime = undefined;
    proxyquire('./', {}); // Ensure fresh require
    expect(global.regeneratorRuntime).to.equal(require('regenerator-runtime'));
  });
});
