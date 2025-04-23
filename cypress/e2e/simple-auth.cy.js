/// <reference types="cypress" />

describe('Simple Authentication Tests', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login.html');
    
    // Wait for the page to load
    cy.contains('Script Memorization Tool').should('be.visible');
  });

  it('should display the login page correctly', () => {
    // Check that the login page elements are visible
    cy.contains('h1', 'Script Memorization Tool').should('be.visible');
    cy.contains('Login with Passkey').should('be.visible');
    cy.contains('Skip login and continue as guest').should('be.visible');
  });

  it('should allow skipping login', () => {
    // Click the "Skip login" link
    cy.contains('Skip login and continue as guest').click();
    
    // Verify we're redirected to the main page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should show registration form when clicking "Register a new passkey"', () => {
    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Verify the registration form is displayed
    cy.get('#register-form').should('not.have.class', 'hidden');
    cy.get('#username').should('be.visible');
    cy.get('#register-button').should('be.visible');
  });

  it('should hide registration form when clicking "Cancel"', () => {
    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Verify the registration form is displayed
    cy.get('#register-form').should('not.have.class', 'hidden');
    
    // Click the "Cancel" button
    cy.get('#cancel-register').click();
    
    // Verify the registration form is hidden
    cy.get('#register-form').should('have.class', 'hidden');
  });

  it('should validate username in registration form', () => {
    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Try to register without entering a username
    cy.get('#register-button').click();
    
    // Verify error message is displayed
    cy.get('#status').should('be.visible')
      .and('contain', 'Please enter a username');
  });
});
