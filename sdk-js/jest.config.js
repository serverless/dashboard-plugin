'use strict';

module.exports = {
  collectCoverage: true,
  coverageDirectory: '../coverage/',
  coveragePathIgnorePatterns: ['^<rootDir>/.+\\.test.js$'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['^<rootDir>/(?:dist|node_modules)/'],
};
