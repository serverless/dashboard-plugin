'use strict';

// Ensure minimal changes to test files, when migrating from Jest
// TODO: Clear this hack, once we're sure on which test runner we want to finally settle
const Mocha = require('mocha/lib/mocha');
const { EVENT_FILE_PRE_REQUIRE } = require('mocha/lib/suite').constants;

Mocha.prototype.run = ((run) =>
  function (...args) {
    this.suite.on(EVENT_FILE_PRE_REQUIRE, () => {
      global.expect = require('chai').expect;
      global.test = global.it;
      global.beforeAll = global.before;
      global.afterAll = global.after;
    });
    return run.call(this, ...args);
  })(Mocha.prototype.run);
