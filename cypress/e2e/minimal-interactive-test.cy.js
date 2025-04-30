/// <reference types="cypress" />

describe('Minimal Interactive Mode Test', () => {
  it('should load the application and verify interactive mode button exists', () => {
    // Visit the application
    cy.visit('/');

    // Verify the title
    cy.title().should('contain', 'Script Memorization');

    // Verify basic elements
    cy.contains('Script Memorization').should('be.visible');
    cy.get('#scriptLibrary').should('exist');

    // Select a sample script
    cy.get('#scriptLibrary').select('sample-script');

    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');

    // Select a character
    cy.get('select#characterSelect').select('ALICE');

    // Verify the Interactive Practice button exists
    cy.get('button.memorization-practice-button').should('exist');

    // Click the Interactive Practice button
    cy.get('button.memorization-practice-button').click();

    // Wait for the view to load
    cy.wait(2000);

    // Look for any button that might appear in the interactive view
    cy.get('button').then(($buttons) => {
      // Log all button texts to help with debugging
      const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
      cy.log('Found buttons:', buttonTexts);

      // Verify that at least one button contains text related to the interactive mode
      const hasInteractiveButton = buttonTexts.some(text =>
        text.includes('Start') ||
        text.includes('Practice') ||
        text.includes('Back')
      );

      expect(hasInteractiveButton).to.be.true;
    });
  });
});
