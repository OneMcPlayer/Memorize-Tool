/// <reference types="cypress" />

describe('WebAuthn Tests with Mocking', () => {
  beforeEach(() => {
    // Mock WebAuthn API before loading the page
    cy.visit('/login.html', {
      onBeforeLoad(win) {
        // Create a mock credential
        const mockCredential = {
          id: 'mockCredentialId',
          rawId: Cypress.Buffer.from('mockCredentialId', 'utf8'),
          response: {
            clientDataJSON: Cypress.Buffer.from(JSON.stringify({
              type: 'webauthn.create',
              challenge: 'mockChallenge',
              origin: 'http://localhost:3000'
            }), 'utf8'),
            attestationObject: Cypress.Buffer.from('mockAttestationObject', 'utf8'),
            authenticatorData: Cypress.Buffer.from('mockAuthenticatorData', 'utf8'),
            signature: Cypress.Buffer.from('mockSignature', 'utf8')
          },
          type: 'public-key'
        };

        // Mock navigator.credentials.create
        cy.stub(win.navigator.credentials, 'create').callsFake(() => {
          return Promise.resolve(mockCredential);
        });

        // Mock navigator.credentials.get
        cy.stub(win.navigator.credentials, 'get').callsFake(() => {
          return Promise.resolve(mockCredential);
        });

        // Override the isWebAuthnSupported function
        win.isWebAuthnSupported = () => true;
        
        // Override the isLocalhost function
        win.isLocalhost = () => true;
      }
    });
  });

  it('should attempt to register a new passkey with mocked WebAuthn', () => {
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
    
    // Verify we're redirected to the main page or show a success message
    cy.url().should('include', '/');
  });

  it('should attempt to authenticate with a passkey with mocked WebAuthn', () => {
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
