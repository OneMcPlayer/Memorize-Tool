const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('before:browser:launch', (browser, launchOptions) => {
        // Allow autoplay for audio in Chrome-based browsers
        if (browser.name === 'chrome' || browser.name === 'electron') {
          launchOptions.args.push('--autoplay-policy=no-user-gesture-required');
          launchOptions.args.push('--allow-file-access-from-files');
          launchOptions.args.push('--use-fake-ui-for-media-stream');
          launchOptions.args.push('--use-fake-device-for-media-stream');
          launchOptions.args.push(`--use-file-for-fake-audio-capture=${config.projectRoot}/cypress/fixtures/fake-audio.wav`);
        }

        // Allow autoplay for audio in Firefox
        if (browser.name === 'firefox') {
          launchOptions.preferences['media.autoplay.default'] = 0;
          launchOptions.preferences['media.autoplay.enabled'] = true;
        }

        return launchOptions;
      });
    },
    // Increase timeout for audio tests
    defaultCommandTimeout: 10000,
    // Add retries for flaky audio tests
    retries: {
      runMode: 2,
      openMode: 1
    },
  },
  video: true, // Enable video recording to help debug audio issues
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 720,
  // Disable Chrome web security to allow cross-origin requests (for audio testing)
  chromeWebSecurity: false
});