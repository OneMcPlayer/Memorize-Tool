describe('Memorize Tool - Basic Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the application', () => {
    cy.get('title').should('contain', 'Script Memorization Tool');
    cy.get('#app').should('exist');
  });

  it('should have language selector', () => {
    cy.get('#languageSelect').should('exist');
    cy.get('#languageSelect').should('contain', 'English');
    cy.get('#languageSelect').should('contain', 'Italiano');
  });

  it('should have theme toggle button', () => {
    cy.get('#themeToggle').should('exist');
    
    // Ensure body doesn't have dark-mode class initially
    cy.get('body').should('not.have.class', 'dark-mode');
    
    // Force click to ensure the event fires properly
    cy.get('#themeToggle').click({force: true});
    
    // Use should with a callback to retry until it passes
    cy.get('body').should(($body) => {
      expect($body).to.have.class('dark-mode');
    });
  });

  it('should open options menu', () => {
    cy.get('#optionsToggle').should('exist');
    cy.get('#optionsToggle').click();
    cy.get('#optionsMenu').should('be.visible');
    cy.get('#optionAbout').should('exist');
    cy.get('#optionHelp').should('exist');
  });
});