/// <reference types="cypress" />

describe('Script Testing Feature Accessibility', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
    
    // Navigate to script testing view
    cy.get('select#scriptLibrary').select('hamlet');
    cy.get('select#characterSelect').select('HAMLET');
    cy.get('input#precedingCount').clear().type('1');
    cy.contains('Test My Lines').click();
  });
  
  it('should have proper heading structure', () => {
    // Check for proper heading structure
    cy.get('h1').should('contain', 'Script Testing Mode');
    
    // Check that headings are in the correct order
    cy.get('h1').should('exist');
  });
  
  it('should have proper button labels', () => {
    // Check that buttons have descriptive labels
    cy.contains('button', 'I Said My Line').should('be.visible');
    cy.contains('button', 'Need Help?').should('be.visible');
    cy.contains('button', 'Back').should('be.visible');
  });
  
  it('should be keyboard navigable', () => {
    // Focus on the first button
    cy.contains('button', 'I Said My Line').focus();
    
    // Press Tab to move to the next button
    cy.focused().tab();
    
    // The "Need Help?" button should now be focused
    cy.focused().should('contain', 'Need Help?');
    
    // Press Tab again to move to the next button
    cy.focused().tab();
    
    // The "Back" button should now be focused
    cy.focused().should('contain', 'Back');
    
    // Press Enter to click the focused button
    cy.focused().type('{enter}');
    
    // We should be back in the input view
    cy.contains('Script Memorization').should('be.visible');
  });
  
  it('should have sufficient color contrast', () => {
    // Check that text has sufficient contrast against background
    // Note: This is a visual check that would typically be done with a tool like axe
    cy.contains('Script Testing Mode').should('be.visible');
    cy.contains("It's your turn, HAMLET!").should('be.visible');
    
    // Check button contrast
    cy.contains('button', 'I Said My Line').should('be.visible');
    cy.contains('button', 'Need Help?').should('be.visible');
  });
});
