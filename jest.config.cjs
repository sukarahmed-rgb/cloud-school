module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.js'],
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 57,
      functions: 64,
      lines: 68,
      statements: 68,
    },
  },
};
