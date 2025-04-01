describe('Memorize Tool - Script Interactions', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for any initial loading to complete
    cy.get('.spinner').should('not.be.visible', { timeout: 10000 });
  });

  it('should show converter interface in advanced mode', () => {
    // Open options menu
    cy.get('#optionsToggle').click();
    
    // Enable advanced mode
    cy.get('#advancedModeToggle').click();
    
    // Click on Script Converter option
    cy.get('#optionConverter').click();
    
    // Verify converter UI is shown
    cy.contains('Script Converter').should('be.visible');
    cy.get('textarea').should('exist');
  });
  
  it('should handle a script conversion', () => {
    // Open options menu
    cy.get('#optionsToggle').click();
    
    // Enable advanced mode
    cy.get('#advancedModeToggle').click();
    
    // Open converter
    cy.get('#optionConverter').click();
    
    // Input sample script text
    const sampleScript = `TITLE: Sample Script
CHARACTERS:
ALICE - The protagonist
BOB - Supporting character

ACT 1
SCENE 1

ALICE: Hello there!
BOB: Hi Alice, how are you today?
ALICE: I'm doing great, thank you!`;

    cy.get('textarea').type(sampleScript);
    
    // Click convert button (adjust selector as needed)
    cy.contains('button', 'Convert').click();
    
    // Verify that the conversion output appears
    cy.get('.conversion-output').should('exist');
    cy.get('.conversion-output').should('not.be.empty');
  });
});