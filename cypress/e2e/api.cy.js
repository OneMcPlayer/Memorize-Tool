/// <reference types="cypress" />

describe('API Integration Tests', () => {
  it('should check if passkeys are supported', () => {
    // Make a direct API call to check passkey support
    cy.request('/api/passkey/supported')
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('supported');
        expect(response.body).to.have.property('message');
      });
  });
  
  it('should handle authentication API errors correctly', () => {
    // Make a direct API call with invalid data
    cy.request({
      method: 'POST',
      url: '/api/passkey/authenticate',
      body: { credential: { id: 'invalid-id' } },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.be.oneOf([400, 401, 500]); // Depending on your API's error handling
      expect(response.body).to.have.property('error');
    });
  });
  
  it('should handle registration API errors correctly', () => {
    // Make a direct API call with invalid data
    cy.request({
      method: 'POST',
      url: '/api/passkey/register',
      body: { username: 'test' }, // Missing credential
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.be.oneOf([400, 500]); // Depending on your API's error handling
      expect(response.body).to.have.property('error');
    });
  });
  
  it('should verify token endpoint works correctly', () => {
    // Make a direct API call to verify endpoint
    cy.request({
      method: 'GET',
      url: '/api/passkey/verify',
      headers: {
        'Authorization': 'Bearer invalid-token'
      },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401); // Should be unauthorized
    });
  });
});
