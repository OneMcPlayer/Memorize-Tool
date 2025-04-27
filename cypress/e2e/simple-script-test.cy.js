/// <reference types="cypress" />

describe('Simple Script Testing', () => {
  it('should load the application and verify basic elements', () => {
    // Visit the application
    cy.visit('/');
    
    // Verify the title
    cy.title().should('contain', 'Script Memorization');
    
    // Verify basic elements
    cy.contains('Script Memorization').should('be.visible');
    cy.get('#scriptLibrary').should('exist');
    cy.get('#languageSelect').should('exist');
  });
  
  it('should have script selection functionality', () => {
    cy.visit('/');
    
    // Check that script library dropdown exists
    cy.get('#scriptLibrary').should('exist');
    
    // Select a script (using the first non-placeholder option)
    cy.get('#scriptLibrary option').eq(1).then($option => {
      const scriptValue = $option.val();
      cy.get('#scriptLibrary').select(scriptValue);
      
      // After selecting a script, character selection should appear
      cy.contains('Select Your Character').should('be.visible');
      cy.get('#characterSelect').should('exist');
    });
  });
});
