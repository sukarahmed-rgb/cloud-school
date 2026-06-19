module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.js'],
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
