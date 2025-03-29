module.exports = {
  // The root directory that Jest should scan for tests and modules
  rootDir: '.',
  
  // The test environment that will be used for testing (jsdom for browser-like env)
  testEnvironment: 'jsdom',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Use this to set up specific test setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  
  // Use this when running tests that use ESM modules
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Map module paths for imports
  moduleNameMapper: {
    '^/Memorize-Tool/js/(.*)$': '<rootDir>/js/$1'
  }
};
