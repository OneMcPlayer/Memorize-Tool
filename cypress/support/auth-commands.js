// Authentication-related Cypress commands

// Command to login as a guest
Cypress.Commands.add('loginAsGuest', () => {
  cy.visit('/login.html');
  cy.contains('Skip login and continue as guest').click();
  cy.url().should('eq', Cypress.config().baseUrl + '/');
});

// Command to mock WebAuthn and set up a fake authenticated session
Cypress.Commands.add('mockWebAuthnAndLogin', () => {
  // Visit the login page with WebAuthn mocking
  cy.visit('/login.html', {
    onBeforeLoad(win) {
      // Create a mock credential
      const mockCredential = {
        id: 'mockCredentialId',
        rawId: Cypress.Buffer.from('mockCredentialId', 'utf8'),
        response: {
          clientDataJSON: Cypress.Buffer.from(JSON.stringify({
            type: 'webauthn.get',
            challenge: 'mockChallenge',
            origin: 'http://localhost:3000'
          }), 'utf8'),
          authenticatorData: Cypress.Buffer.from('mockAuthenticatorData', 'utf8'),
          signature: Cypress.Buffer.from('mockSignature', 'utf8')
        },
        type: 'public-key'
      };

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

// Command to set up a fake authenticated session directly
Cypress.Commands.add('setupAuthenticatedSession', () => {
  cy.window().then((win) => {
    const expiryTime = Date.now() + 3600000; // 1 hour from now
    win.localStorage.setItem('authToken', 'mock-token');
    win.localStorage.setItem('authTokenExpiry', expiryTime.toString());
    win.localStorage.setItem('user', JSON.stringify({
      id: 'mock-user-id',
      username: 'testuser',
      email: 'test@example.com'
    }));
  });
});
