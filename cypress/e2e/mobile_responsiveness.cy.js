describe('Mobile Responsiveness', () => {
  const currentScriptId = 'il-calapranzi';
  const practiceCharacter = 'BEN';

  beforeEach(() => {
    cy.visit('/');
  });

  it('should adapt to mobile viewport', () => {
    cy.viewport('iphone-x');

    cy.get('.app-content').should('be.visible');
    cy.get('.header-controls').should('be.visible');
    cy.get('#loginButton').should('not.be.visible');
    cy.get('.api-debug-panel').should('not.exist');

    cy.get('#scriptLibrary').select(currentScriptId);
    cy.get('#characterSelect').select(practiceCharacter);
    cy.get('#precedingCount').clear().type('1');

    cy.contains('Ready to rehearse').should('be.visible');
    cy.contains('Try Voice Practice').should('be.visible');
    cy.contains('Start Practice').click();

    cy.contains('Practice Mode').should('be.visible');
    cy.contains('Verify My Line').should('be.visible');
    cy.contains('Skip to Next Line').should('be.visible');
    cy.contains('Verify My Line').click();

    cy.get('#card.revealed').should('exist');
    cy.contains('Next').should('be.visible');
  });

  it('should adapt to landscape orientation', () => {
    cy.viewport('iphone-x', 'landscape');

    cy.get('.app-content').should('be.visible');
    cy.get('#scriptLibrary').select(currentScriptId);
    cy.get('#characterSelect').select(practiceCharacter);
    cy.get('#precedingCount').clear().type('1');

    cy.contains('Start Practice').click();
    cy.contains('Practice Mode').should('be.visible');
    cy.get('.context-section').should('be.visible');
    cy.contains('Verify My Line').click();
    cy.get('#card.revealed').should('exist');
  });
});
