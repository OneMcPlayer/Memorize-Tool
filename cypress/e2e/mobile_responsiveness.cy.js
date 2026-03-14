describe('Mobile Responsiveness', () => {
  it('should adapt to mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/');

    cy.get('.app-content').should('be.visible');
    cy.get('.header-controls').should('be.visible');
    cy.get('#loginButton').should('not.be.visible');
    cy.get('.api-debug-panel').should('not.exist');

    cy.get('#scriptLibrary').select('sample-script');
    cy.get('#characterSelect').select('ALICE');
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
    cy.visit('/');

    cy.get('.app-content').should('be.visible');
    cy.get('#scriptLibrary').select('sample-script');
    cy.get('#characterSelect').select('ALICE');
    cy.get('#precedingCount').clear().type('1');

    cy.contains('Start Practice').click();
    cy.contains('Practice Mode').should('be.visible');
    cy.get('.context-section').should('be.visible');
    cy.contains('Verify My Line').click();
    cy.get('#card.revealed').should('exist');
  });
});
