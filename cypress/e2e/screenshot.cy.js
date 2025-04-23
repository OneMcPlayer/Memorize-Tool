/// <reference types="cypress" />

describe('Take Screenshots', () => {
  it('takes a screenshot of the main page', () => {
    cy.visit('/Memorize-Tool');
    cy.screenshot('main-page');
  });
});
