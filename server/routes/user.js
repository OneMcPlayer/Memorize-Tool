const express = require('express');
const router = express.Router();

// User information endpoint
router.get('/', (req, res) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;

  // Check if authorization header exists and has the format 'Bearer TOKEN'
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Extract the token
  const token = authHeader.split(' ')[1];

  // For development/testing purposes, accept any non-empty token
  // In production, you would validate the token against stored tokens
  if (!token) {
    console.error('Empty token');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Get user information from headers set by Nginx auth_request
  // These headers are set by the passkey verification endpoint
  const username = req.headers['remote-user'] || 'passkey-user';
  const displayName = req.headers['remote-name'] || 'Passkey User';
  const email = req.headers['remote-email'] || 'user@example.com';
  const groups = req.headers['remote-groups'] ? req.headers['remote-groups'].split(',') : [];

  res.json({
    username,
    displayName,
    email,
    groups,
    isAuthenticated: true
  });
});

module.exports = router;
