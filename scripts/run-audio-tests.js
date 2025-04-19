/**
 * Script to run audio tests and save the results
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create results directory if it doesn't exist
const resultsDir = path.join(__dirname, '../cypress/results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Get the current timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');

// Run the Cypress tests
console.log('Running audio tests...');
try {
  // Start the development server in the background
  const serverProcess = require('child_process').spawn('npm', ['start'], {
    stdio: 'ignore',
    detached: true
  });
  
  // Give the server some time to start
  console.log('Starting development server...');
  setTimeout(() => {
    try {
      // Run the Cypress tests
      execSync('npx cypress run --spec "cypress/e2e/audio-tests.cy.js"', {
        stdio: 'inherit'
      });
      
      // Copy the results to a timestamped file
      const resultsFile = path.join(resultsDir, `audio-test-results-${timestamp}.json`);
      if (fs.existsSync('cypress/results.json')) {
        fs.copyFileSync('cypress/results.json', resultsFile);
        console.log(`Test results saved to ${resultsFile}`);
      }
      
      // Kill the server process
      process.kill(-serverProcess.pid);
      
      console.log('Audio tests completed successfully!');
    } catch (error) {
      console.error('Error running Cypress tests:', error);
      
      // Kill the server process
      process.kill(-serverProcess.pid);
      
      process.exit(1);
    }
  }, 10000); // Wait 10 seconds for the server to start
} catch (error) {
  console.error('Error starting development server:', error);
  process.exit(1);
}
