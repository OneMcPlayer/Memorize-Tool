describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should adapt to mobile viewport', () => {
    // Set viewport to mobile size
    cy.viewport('iphone-x');
    
    // Check that the app content adjusts to mobile size
    cy.get('.app-content').should('be.visible');
    
    // Verify header controls are visible and properly positioned
    cy.get('.header-controls').should('be.visible');
    
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');
    
    // Select a character
    cy.get('#characterSelect').select('ALICE');
    
    // Set context lines
    cy.get('#precedingCount').clear().type('1');
    
    // Extract lines
    cy.contains('Extract My Lines').click();
    
    // Verify that we're in practice mode
    cy.contains('Practice Mode').should('be.visible');
    
    // Verify that buttons are properly sized for mobile
    cy.contains('Verify My Line').should('be.visible');
    cy.contains('Skip to Next Line').should('be.visible');
    
    // Verify the line
    cy.contains('Verify My Line').click();
    
    // Verify that the line is revealed
    cy.get('#card.revealed').should('exist');
    
    // Verify Next button is visible
    cy.contains('Next').should('be.visible');
  });
  
  it('should adapt to landscape orientation', () => {
    // Set viewport to landscape mobile
    cy.viewport('iphone-x', 'landscape');
    
    // Check that the app content adjusts to landscape orientation
    cy.get('.app-content').should('be.visible');
    
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');
    
    // Select a character
    cy.get('#characterSelect').select('ALICE');
    
    // Set context lines
    cy.get('#precedingCount').clear().type('1');
    
    // Extract lines
    cy.contains('Extract My Lines').click();
    
    // Verify that we're in practice mode
    cy.contains('Practice Mode').should('be.visible');
    
    // Verify that the context section is visible and properly sized
    cy.get('.context-section').should('be.visible');
    
    // Verify the line
    cy.contains('Verify My Line').click();
    
    // Verify that the line is revealed
    cy.get('#card.revealed').should('exist');
  });
});
