module.exports = {
  coverageDirectory: './coverage/',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  testPathIgnorePatterns: ['/dist', '/node_modules', '/sdk-js'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/runtime.js']
}
