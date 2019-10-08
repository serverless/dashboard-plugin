'use strict';

const proxyquire = require('proxyquire');

describe('index', () => {
  test('registers regeneratorRuntime', () => {
    proxyquire('./', {}); // Ensure fresh require
    expect(global.regeneratorRuntime).to.equal(require('regenerator-runtime'));
  });
});
