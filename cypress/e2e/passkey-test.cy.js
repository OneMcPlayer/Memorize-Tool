/// <reference types="cypress" />

describe('Passkey Authentication Tests', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login.html', {
      onBeforeLoad(win) {
        // Create a stub for WebAuthn API
        const credentialsMock = {
          create: cy.stub().resolves({
            id: 'test-credential-id',
            rawId: new Uint8Array(16).buffer,
            response: {
              clientDataJSON: new Uint8Array(16).buffer,
              attestationObject: new Uint8Array(16).buffer
            },
            type: 'public-key'
          }),
          get: cy.stub().resolves({
            id: 'test-credential-id',
            rawId: new Uint8Array(16).buffer,
            response: {
              clientDataJSON: new Uint8Array(16).buffer,
              authenticatorData: new Uint8Array(16).buffer,
              signature: new Uint8Array(16).buffer
            },
            type: 'public-key'
          })
        };
        
        // Replace the credentials API
        cy.stub(win.navigator, 'credentials').value(credentialsMock);
        
        // Override the isWebAuthnSupported function
        win.isWebAuthnSupported = () => true;
        
        // Override the isLocalhost function
        win.isLocalhost = () => true;
      }
    });
  });

  it('should register a new passkey', () => {
    // Intercept the registration API call
    cy.intercept('POST', '/api/passkey/register', {
      statusCode: 200,
      body: { success: true, message: 'Passkey registered successfully', userId: 'mock-user-id' }
    }).as('registerRequest');

    // Intercept the authentication API call that follows registration
    cy.intercept('POST', '/api/passkey/authenticate', {
      statusCode: 200,
      body: { 
        success: true, 
        message: 'Authentication successful',
        user: { id: 'mock-user-id', username: 'testuser', email: 'test@example.com' },
        token: 'mock-token',
        expiresAt: Date.now() + 86400000 // 24 hours from now
      }
    }).as('authRequest');

    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Enter a username
    cy.get('#username').type('testuser');
    
    // Click the "Register Passkey" button
    cy.get('#register-button').click();
    
    // Wait for the registration API call
    cy.wait('@registerRequest').its('request.body').should('deep.include', {
      username: 'testuser'
    });
    
    // Wait for the authentication API call
    cy.wait('@authRequest');
    
    // Verify success message
    cy.get('#status').should('be.visible')
      .and('contain', 'Passkey registered successfully');
  });

  it('should authenticate with a passkey', () => {
    // Intercept the authentication API call
    cy.intercept('POST', '/api/passkey/authenticate', {
      statusCode: 200,
      body: { 
        success: true, 
        message: 'Authentication successful',
        user: { id: 'mock-user-id', username: 'testuser', email: 'test@example.com' },
        token: 'mock-token',
        expiresAt: Date.now() + 86400000 // 24 hours from now
      }
    }).as('authRequest');

    // Click the "Login with Passkey" button
    cy.contains('Login with Passkey').click();
    
    // Wait for the authentication API call
    cy.wait('@authRequest');
    
    // Verify we're redirected to the main page
    cy.url().should('include', '/');
    
    // Verify the token is stored in localStorage
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.equal('mock-token');
    });
  });

  it('should handle registration errors gracefully', () => {
    // Intercept the registration API call and force it to fail
    cy.intercept('POST', '/api/passkey/register', {
      statusCode: 500,
      body: { success: false, error: 'Server error during registration' }
    }).as('registerRequest');

    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Enter a username
    cy.get('#username').type('testuser');
    
    // Click the "Register Passkey" button
    cy.get('#register-button').click();
    
    // Wait for the API call
    cy.wait('@registerRequest');
    
    // Verify error message
    cy.get('#status').should('be.visible')
      .and('contain', 'Registration failed');
  });

  it('should handle authentication errors gracefully', () => {
    // Intercept the authentication API call and force it to fail
    cy.intercept('POST', '/api/passkey/authenticate', {
      statusCode: 401,
      body: { success: false, error: 'Invalid credential' }
    }).as('authRequest');

    // Click the "Login with Passkey" button
    cy.contains('Login with Passkey').click();
    
    // Wait for the API call
    cy.wait('@authRequest');
    
    // Verify error message
    cy.get('#status').should('be.visible')
      .and('contain', 'Authentication failed');
  });
});
