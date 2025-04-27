/// <reference types="cypress" />

describe('Check Available Scripts', () => {
  it('should list available scripts in the dropdown', () => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
    
    // Log all available script options
    cy.get('select#scriptLibrary').then($select => {
      const options = Array.from($select.find('option')).map(option => {
        return {
          value: option.value,
          text: option.text
        };
      });
      cy.log('Available script options:', JSON.stringify(options));
    });
  });
});
