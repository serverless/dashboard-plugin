module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: './coverage/',
  setupFiles: ['<rootDir>/src/runtime.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/dist', '/node_modules', '/sdk-js']
}
