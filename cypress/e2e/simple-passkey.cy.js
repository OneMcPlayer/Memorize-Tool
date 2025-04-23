/// <reference types="cypress" />

describe('Simple Passkey Tests', () => {
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
        
        // Mock the arrayBufferToBase64 function
        win.arrayBufferToBase64 = (buffer) => {
          return 'mock-base64-string';
        };
      }
    });
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
