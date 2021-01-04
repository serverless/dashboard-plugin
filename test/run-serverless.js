'use strict';

const path = require('path');
const setupServerless = require('./setupServerless');

module.exports = require('@serverless/test/setup-run-serverless-fixtures-engine')({
  fixturesDir: path.resolve(__dirname, './fixtures'),
  resolveServerlessDir: async () => (await setupServerless()).root,
});
