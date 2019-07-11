'use strict';

module.exports = {
  collectCoverage: true,
  coveragePathIgnorePatterns: ['^<rootDir>/.+\\.test.js$'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['^<rootDir>/(?:dist|node_modules)/'],
};
