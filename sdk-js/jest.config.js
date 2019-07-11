'use strict';

module.exports = {
  coveragePathIgnorePatterns: ['^<rootDir>/.+\\.test.js$'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['^<rootDir>/(?:dist|node_modules)/'],
};
