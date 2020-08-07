'use strict';

const runServerless = require('@serverless/test/run-serverless');
const setupServerless = require('./setupServerless');

module.exports = async (options) => runServerless((await setupServerless()).root, options);
