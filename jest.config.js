module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: './coverage/',
  setupFilesAfterEnv: ['<rootDir>/src/runtime.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/dist', '/node_modules', '/sdk-js'],
  // Switching to circus, as it's less buggy than default runner:
  // https://github.com/facebook/jest/issues/6692
  // https://github.com/facebook/jest/issues/6695
  testRunner: 'jest-circus/runner',
  // Workaround bug where output is not shown until test finalizes
  // https://github.com/facebook/jest/issues/5281
  useStderr: true
}
