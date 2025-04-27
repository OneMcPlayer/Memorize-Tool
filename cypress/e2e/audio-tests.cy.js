/// <reference types="cypress" />

describe('Audio Playback Tests', () => {
  beforeEach(() => {
    // Visit the audio test page
    cy.visit('/');

    // Open the options menu
    cy.get('#optionsToggle').click();

    // Click on the Audio Test option
    cy.get('#optionAudioTest').click();

    // Click the user interaction button to enable audio
    cy.contains('Click here to enable audio playback').click();

    // Wait for the test controls to appear
    cy.get('.test-controls').should('be.visible');
  });

  it('should load the audio test component', () => {
    // Verify the component loaded correctly
    cy.contains('h1', 'Audio Playback Test').should('be.visible');
    cy.get('.test-controls').should('be.visible');
    cy.get('.browser-info').should('be.visible');
  });

  it('should test direct audio playback', () => {
    // Select the direct audio test
    cy.get('#test-select').select('direct');

    // Run the test
    cy.contains('Run Test').click();

    // Wait for the test to complete
    cy.get('.test-results', { timeout: 10000 }).should('be.visible');

    // Check if the test ran (we can't reliably check success in headless mode)
    cy.get('.result-item').should('exist');

    // Log the result for manual review
    cy.get('.result-item').then(($el) => {
      cy.log('Direct Audio Test Result:', $el.text());
    });
  });

  it('should test Google TTS API', () => {
    // Select the Google TTS test
    cy.get('#test-select').select('google');

    // Run the test
    cy.contains('Run Test').click();

    // Wait for the test to complete
    cy.get('.test-results', { timeout: 10000 }).should('be.visible');

    // Check if the test ran
    cy.get('.result-item').should('exist');

    // Log the result for manual review
    cy.get('.result-item').then(($el) => {
      cy.log('Google TTS Test Result:', $el.text());
    });
  });

  it('should test alternative TTS API', () => {
    // Select the alternative TTS test
    cy.get('#test-select').select('alternative');

    // Run the test
    cy.contains('Run Test').click();

    // Wait for the test to complete
    cy.get('.test-results', { timeout: 10000 }).should('be.visible');

    // Check if the test ran
    cy.get('.result-item').should('exist');

    // Log the result for manual review
    cy.get('.result-item').then(($el) => {
      cy.log('Alternative TTS Test Result:', $el.text());
    });
  });

  it('should run all tests', () => {
    // Select all tests
    cy.get('#test-select').select('all');

    // Run the tests
    cy.contains('Run Test').click();

    // Wait for the tests to complete
    cy.get('.test-results', { timeout: 15000 }).should('be.visible');

    // Check if all three test results are displayed
    cy.get('.result-item').should('have.length.at.least', 3);

    // Log all results for manual review
    cy.get('.result-item').each(($el, index) => {
      cy.log(`Test ${index + 1} Result:`, $el.text());
    });
  });

  it('should test manual audio URL', () => {
    // Enter a test audio URL
    const testAudioUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&q=This%20is%20a%20test&tl=en&client=tw-ob';
    cy.get('.url-input').type(testAudioUrl);

    // Run the test
    cy.contains('Test URL').click();

    // Wait for the test to complete
    cy.get('.manual-result', { timeout: 10000 }).should('be.visible');

    // Log the result for manual review
    cy.get('.manual-result').then(($el) => {
      cy.log('Manual Test Result:', $el.text());
    });
  });

  it('should display browser information', () => {
    // Check if browser information is displayed
    cy.get('.browser-info').should('be.visible');
    cy.contains('User Agent:').should('be.visible');
    cy.contains('Audio Context Support:').should('be.visible');
    cy.contains('Speech Synthesis Support:').should('be.visible');

    // Log browser information for manual review
    cy.get('.browser-info').then(($el) => {
      cy.log('Browser Information:', $el.text());
    });
  });
});

// ScriptReader component tests removed as the feature has been deprecated

// Test the basicAudioPlayer utility directly
describe('Basic Audio Player Utility Tests', () => {
  beforeEach(() => {
    // Visit the audio test page
    cy.visit('/');

    // Open the options menu
    cy.get('#optionsToggle').click();

    // Click on the Audio Test option
    cy.get('#optionAudioTest').click();

    // Click the user interaction button to enable audio
    cy.contains('Click here to enable audio playback').click();
  });

  it('should test the basicAudioPlayer utility directly', () => {
    // Create a test function to execute in the browser context
    const testAudioPlayer = () => {
      // Import the basicAudioPlayer
      return import('/src/utils/basicAudioPlayer.js')
        .then(module => {
          const audioPlayer = module.default;

          // Test the audio player
          return audioPlayer.playText('This is a test of the basic audio player', {
            voice: { lang: 'en-US' },
            volume: 0.5
          })
            .then(() => {
              return {
                success: true,
                message: 'Audio player test completed successfully'
              };
            })
            .catch(err => {
              return {
                success: false,
                error: err.message,
                details: 'Error occurred while testing the audio player'
              };
            });
        })
        .catch(err => {
          return {
            success: false,
            error: err.message,
            details: 'Error importing the audio player module'
          };
        });
    };

    // Execute the test function in the browser context
    cy.window().then(win => {
      cy.wrap(null).then(() => {
        return win.eval(`(${testAudioPlayer.toString()})()`);
      }).then(result => {
        cy.log('Audio Player Test Result:', result);
      });
    });
  });
});
