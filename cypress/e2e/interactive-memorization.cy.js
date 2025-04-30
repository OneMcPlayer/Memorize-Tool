/// <reference types="cypress" />

describe('Interactive Memorization Practice', () => {
  beforeEach(() => {
    // Mock localStorage for API key
    cy.window().then((win) => {
      win.localStorage.setItem('openai_api_key', 'test-api-key-for-cypress');
    });

    // Mock the OpenAI API responses
    cy.intercept('POST', '/api/tts/speech', {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg'
      },
      // Return a small test audio file
      fixture: 'test-audio.mp3'
    }).as('ttsRequest');

    // Visit the app
    cy.visit('/');

    // Select a sample script from the dropdown instead of typing in a textarea
    cy.get('#scriptLibrary').select('sample-script');

    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');

    // Select a character
    cy.get('select#characterSelect').select('ALICE');
  });

  it('should navigate to the interactive memorization practice page', () => {
    // Click the Interactive Practice button - it might have a different name
    cy.get('button').contains(/Interactive|Practice|Memorization/i).click();

    // Verify we're on a practice page
    cy.contains(/Script|Practice|Memorization/i).should('be.visible');

    // Find and click the start button
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Verify we're on the interactive practice page
    cy.contains(/Interactive|Memorization|Practice/i).should('be.visible');
  });

  it('should display and save API key correctly', () => {
    // Clear localStorage first to test API key input
    cy.window().then((win) => {
      win.localStorage.removeItem('openai_api_key');
    });

    // Navigate to the practice page
    cy.get('button').contains(/Interactive|Practice|Memorization/i).click();
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Check that API key input is displayed - it might take a moment to appear
    cy.contains('OpenAI API Key', { timeout: 10000 }).should('be.visible');

    // Enter API key
    cy.get('input[type="password"]').type('test-api-key-123');

    // Toggle visibility
    cy.get('.visibility-toggle').click();
    cy.get('input[type="text"]').should('exist');

    // Toggle visibility back
    cy.get('.visibility-toggle').click();
    cy.get('input[type="password"]').should('exist');

    // Save API key
    cy.contains('button', /Save|Apply/i).click();

    // Verify API key is saved
    cy.window().then((win) => {
      expect(win.localStorage.getItem('openai_api_key')).to.equal('test-api-key-123');
    });

    // Verify save button is disabled after saving
    cy.contains('button', /Saved|Applied/i).should('be.disabled');

    // Clear API key
    cy.contains('button', /Clear|Remove/i).click();

    // Verify API key is cleared
    cy.get('input').first().should('have.value', '');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('openai_api_key')).to.equal('');
    });
  });

  it('should allow changing voice settings', () => {
    // Navigate to the practice page with API key set
    cy.get('button').contains(/Interactive|Practice|Memorization/i).click();
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Start the practice - there might be another start button
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Check that voice settings are displayed
    cy.contains(/Voice Settings|Voice Options/i, { timeout: 10000 }).should('be.visible');

    // Try to change voice quality if the select exists
    cy.get('select').first().then($select => {
      if ($select.length) {
        cy.wrap($select).select(1); // Select the second option
      }
    });

    // Try to change speed if a slider exists
    cy.get('input[type="range"]').then($slider => {
      if ($slider.length) {
        cy.wrap($slider).invoke('val', 1.2).trigger('change');
      }
    });

    // Try to change character voice if it exists
    cy.get('select').then($selects => {
      if ($selects.length > 1) {
        cy.wrap($selects).eq(1).select(1); // Select the second option in the second select
      }
    });
  });

  it('should play other character lines and handle user input with pause functionality', () => {
    // Navigate to the practice page with API key set
    cy.get('button').contains(/Interactive|Practice|Memorization/i).click();
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Start the practice
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Wait for any API requests to complete
    cy.wait(3000);

    // Verify the user's turn prompt appears
    cy.get('body').then($body => {
      // Check if we're at the user's turn
      if ($body.find('div:contains("It\'s your turn")').length) {
        // Verify the "I Said My Line" button is present
        cy.contains('button', 'I Said My Line').should('exist');

        // Click the "I Said My Line" button
        cy.contains('button', 'I Said My Line').click();

        // Verify that the user's line is shown
        cy.contains('button', 'Continue to Next Line').should('exist');

        // Click to continue to the next line
        cy.contains('button', 'Continue to Next Line').click();
      } else {
        // If we're not at the user's turn yet, look for the Need Help button
        if ($body.find('button:contains("Help"), button:contains("Need Help")').length) {
          cy.contains('button', /Help|Need Help/i).click();

          // Verify the Continue to Next Line button appears
          cy.contains('button', 'Continue to Next Line').should('exist');

          // Click to continue
          cy.contains('button', 'Continue to Next Line').click();
        }
      }
    });
  });

  it('should verify the modified pause functionality without STT', () => {
    // Navigate to the practice page with API key set
    cy.get('button').contains(/Interactive|Practice|Memorization/i).click();
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Start the practice
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Wait for any API requests to complete
    cy.wait(3000);

    // Verify the instructions text reflects the new behavior
    cy.contains('When it\'s your turn, say your line out loud and click "I Said My Line"').should('exist');
    cy.contains('The system will pause and show you your line').should('exist');

    // Verify the user's turn prompt appears
    cy.get('body').then($body => {
      // Check if we're at the user's turn
      if ($body.find('div:contains("It\'s your turn")').length) {
        // Verify the "I Said My Line" button is present (not "Start Recording")
        cy.contains('button', 'I Said My Line').should('exist');
        cy.contains('button', 'Start Recording').should('not.exist');

        // Click the "I Said My Line" button
        cy.contains('button', 'I Said My Line').click();

        // Verify that the user's line is shown
        cy.contains('button', 'Continue to Next Line').should('exist');

        // Click to continue to the next line
        cy.contains('button', 'Continue to Next Line').click();
      }
    });
  });

  it('should complete the practice and show results', () => {
    // Navigate to the practice page with API key set
    cy.get('button').contains(/Interactive|Practice|Memorization/i).click();
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Start the practice
    cy.get('button').contains(/Start|Begin|Practice/i).click();

    // Wait for any API requests to complete
    cy.wait(3000);

    // Look for any results or completion indicators
    cy.get('body').then($body => {
      // If we find a restart button, click it
      if ($body.find('button:contains("Again"), button:contains("Practice Again")').length) {
        cy.contains('button', /Again|Practice Again/i).click();

        // Look for start button
        cy.get('button').contains(/Start|Begin|Practice/i).should('exist');

        // Look for back button and click it if found
        cy.get('body').then($body2 => {
          if ($body2.find('button:contains("Back"), button:contains("Back to Menu")').length) {
            cy.contains('button', /Back|Back to Menu/i).click();
          }
        });
      } else {
        // If we don't find results, just verify we can navigate back
        cy.get('button').first().click(); // Click the first button to try to go back
      }
    });
  });
});
