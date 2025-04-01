const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  video: false, // Disable video recording to save storage in CI
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 720
});