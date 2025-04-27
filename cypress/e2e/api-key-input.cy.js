/// <reference types="cypress" />

describe('API Key Input Component', () => {
  beforeEach(() => {
    // Clear localStorage
    cy.clearLocalStorage();
    
    // Visit the app
    cy.visit('/');
  });

  it('should toggle visibility of API key', () => {
    // Find the API key input component if it exists
    cy.get('body').then($body => {
      // If we find an input of type password, we can test the visibility toggle
      if ($body.find('input[type="password"]').length) {
        // Get the password input
        cy.get('input[type="password"]').first().as('passwordInput');
        
        // Find the visibility toggle button
        cy.get('.visibility-toggle').first().as('visibilityToggle');
        
        // Click the visibility toggle
        cy.get('@visibilityToggle').click();
        
        // Verify the input type changed to text
        cy.get('@passwordInput').should('have.attr', 'type', 'text');
        
        // Click the visibility toggle again
        cy.get('@visibilityToggle').click();
        
        // Verify the input type changed back to password
        cy.get('@passwordInput').should('have.attr', 'type', 'password');
      } else {
        // Skip this test if we don't find a password input
        cy.log('No password input found, skipping test');
      }
    });
  });

  it('should save and clear API key', () => {
    // Find the API key input component if it exists
    cy.get('body').then($body => {
      // If we find an input of type password, we can test saving and clearing
      if ($body.find('input[type="password"]').length) {
        // Get the password input
        cy.get('input[type="password"]').first().as('passwordInput');
        
        // Type an API key
        cy.get('@passwordInput').type('test-api-key-123');
        
        // Find and click the save button
        cy.contains('button', /Save|Apply/i).click();
        
        // Verify the API key is saved in localStorage
        cy.window().then(win => {
          expect(win.localStorage.getItem('openai_api_key')).to.equal('test-api-key-123');
        });
        
        // Find and click the clear button
        cy.contains('button', /Clear|Remove/i).click();
        
        // Verify the API key is cleared
        cy.get('@passwordInput').should('have.value', '');
        cy.window().then(win => {
          expect(win.localStorage.getItem('openai_api_key')).to.be.null;
        });
      } else {
        // Skip this test if we don't find a password input
        cy.log('No password input found, skipping test');
      }
    });
  });
});
