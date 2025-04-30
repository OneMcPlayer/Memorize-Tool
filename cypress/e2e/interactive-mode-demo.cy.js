/// <reference types="cypress" />

describe('Interactive Mode Demo Test', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');

    // Wait for the application to load
    cy.contains('Script Memorization').should('be.visible');

    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');

    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');

    // Select the ALICE character
    cy.get('select#characterSelect').select('ALICE');
  });

  it('should navigate through the interactive mode with debug mode enabled', () => {
    // Click the Interactive Practice button
    cy.get('button.memorization-practice-button').click();

    // Wait for the view to load
    cy.wait(2000);

    // Verify the interactive memorization view is loaded by checking for the Start Practice button
    cy.contains('button', 'Start Practice').should('be.visible');

    // Verify the start button exists and click it
    cy.contains('button', 'Start Practice').should('be.visible').click();

    // Wait for the system to process (debug mode should skip API calls)
    cy.wait(3000);

    // Verify the user's turn prompt appears
    cy.contains("It's your turn, ALICE!").should('be.visible');

    // Verify the "I Said My Line" button appears
    cy.contains('button', 'I Said My Line').should('be.visible');

    // Click the "I Said My Line" button
    cy.contains('button', 'I Said My Line').click();

    // Verify that the user's line is shown
    cy.contains('ALICE:').should('be.visible');

    // Verify the "Continue to Next Line" button appears
    cy.contains('button', 'Continue to Next Line').should('be.visible');

    // Click the "Continue to Next Line" button
    cy.contains('button', 'Continue to Next Line').click();

    // Wait for the next line to be processed
    cy.wait(3000);

    // Verify we're at the user's turn again
    cy.contains("It's your turn, ALICE!").should('be.visible');

    // Click the "Need Help?" button this time
    cy.contains('button', 'Need Help?').click();

    // Verify that the user's line is shown
    cy.contains('ALICE:').should('be.visible');

    // Click the "Continue to Next Line" button
    cy.contains('button', 'Continue to Next Line').click();

    // Wait for the next line to be processed
    cy.wait(3000);

    // Verify we're at the user's turn again
    cy.contains("It's your turn, ALICE!").should('be.visible');

    // Go back to the menu
    cy.contains('button', 'Back to Menu').click();

    // Verify we're back at the main view
    cy.contains('Script Memorization').should('be.visible');
  });

  it('should complete the entire practice session and show results', () => {
    // Click the Interactive Practice button
    cy.get('button.memorization-practice-button').click();

    // Wait for the view to load
    cy.wait(2000);

    // Verify the interactive memorization view is loaded by checking for the Start Practice button
    cy.contains('button', 'Start Practice').should('be.visible');

    // Start the practice
    cy.contains('button', 'Start Practice').click();

    // Function to handle each user turn
    const handleUserTurn = () => {
      // Check if we're at the user's turn
      cy.get('body').then($body => {
        if ($body.find('div:contains("It\'s your turn")').length) {
          // Click the "I Said My Line" button
          cy.contains('button', 'I Said My Line').click();

          // Click the "Continue to Next Line" button
          cy.contains('button', 'Continue to Next Line').click();

          // Wait for the next line to be processed
          cy.wait(3000);

          // Recursively handle the next turn
          handleUserTurn();
        } else if ($body.find('h2:contains("Practice Complete")').length ||
                  $body.find('div:contains("Practice Complete")').length) {
          // We've reached the end of the practice
          cy.log('Practice complete detected');

          // Verify the "Back to Menu" button is shown
          cy.contains('button', 'Back to Menu').should('be.visible');

          // Go back to the menu
          cy.contains('button', 'Back to Menu').click();

          // Verify we're back at the main view
          cy.contains('Script Memorization').should('be.visible');
        } else {
          // Wait a bit more for the user's turn to appear
          cy.wait(1000);
          handleUserTurn();
        }
      });
    };

    // Wait for the first user turn to appear
    cy.wait(3000);

    // Start handling user turns
    handleUserTurn();
  });
});
