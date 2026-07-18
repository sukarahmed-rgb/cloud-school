module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.js'],
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
