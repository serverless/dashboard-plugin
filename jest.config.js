'use strict';

module.exports = {
  coveragePathIgnorePatterns: [
    '^<rootDir>/(?:examples|integration-testing|node_modules)/',
    '^<rootDir>/.+\\.test.js$',
  ],
  setupFilesAfterEnv: ['<rootDir>/runtime.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['^<rootDir>/(?:coverage|dist|node_modules|sdk-js)/'],
  // Switching to circus, as it's less buggy than default runner:
  // https://github.com/facebook/jest/issues/6692
  // https://github.com/facebook/jest/issues/6695
  testRunner: 'jest-circus/runner',
  // Workaround bug where output is not shown until test finalizes
  // https://github.com/facebook/jest/issues/5281
  useStderr: true,
};
