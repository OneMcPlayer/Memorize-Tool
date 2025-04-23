const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('./db');

// Helper function to convert base64 to buffer
function base64ToBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

// Helper function to convert buffer to base64
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

// Rate limiting middleware
const rateLimiter = {
  // Store IP addresses and their request counts
  requests: {},

  // Maximum requests per minute
  maxRequests: 10,

  // Time window in milliseconds (1 minute)
  timeWindow: 60 * 1000,

  // Middleware function
  limit: function(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Initialize or reset if time window has passed
    if (!this.requests[ip] || now - this.requests[ip].timestamp > this.timeWindow) {
      this.requests[ip] = {
        count: 1,
        timestamp: now
      };
      return next();
    }

    // Increment request count
    this.requests[ip].count++;

    // Check if rate limit exceeded
    if (this.requests[ip].count > this.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    }

    next();
  }
};

// Register a new passkey
router.post('/register', rateLimiter.limit.bind(rateLimiter), async (req, res) => {
  try {
    const { username, credential } = req.body;

    if (!username || !credential) {
      return res.status(400).json({ error: 'Missing username or credential' });
    }

    // Check if the username already exists
    const existingUser = await db.user.getUserByUsername(username);
    let userId;

    if (existingUser) {
      // Use existing user
      userId = existingUser.id;
    } else {
      // Create a new user
      const newUser = await db.user.createUser(username);
      userId = newUser.id;
    }

    // Store the credential in the database
    await db.passkey.storePasskey(userId, credential.id, credential);

    console.log(`Registered passkey for user: ${username} (${userId})`);

    res.json({
      success: true,
      message: 'Passkey registered successfully',
      userId
    });
  } catch (error) {
    console.error('Error registering passkey:', error);
    res.status(500).json({ error: 'Failed to register passkey' });
  }
});

// Authenticate with a passkey
router.post('/authenticate', rateLimiter.limit.bind(rateLimiter), async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    // Get the passkey from the database
    const passkey = await db.passkey.getPasskeyById(credential.id);

    if (!passkey) {
      return res.status(401).json({ error: 'Invalid credential' });
    }

    // In a real implementation, you would validate the credential signature
    // against the stored credential

    // Get the user
    const user = await db.user.getUserById(passkey.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Update last used time for the passkey
    await db.passkey.updateLastUsed(credential.id);

    // Update last login time for the user
    await db.user.updateLastLogin(user.id);

    console.log(`User authenticated: ${user.username} (${user.id})`);

    // Generate a session token with expiration (24 hours)
    const tokenData = await db.token.createToken(user.id);

    res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token: tokenData.token,
      expiresAt: tokenData.expires_at
    });
  } catch (error) {
    console.error('Error authenticating with passkey:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Check if passkeys are supported
router.get('/supported', (req, res) => {
  res.json({
    supported: true,
    message: 'Passkeys are supported on the server'
  });
});

// Token refresh endpoint
router.post('/refresh', rateLimiter.limit.bind(rateLimiter), async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Empty token' });
    }

    // Validate the current token
    const tokenData = await db.token.validateToken(token);

    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get the user
    const user = await db.user.getUserById(tokenData.user_id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Delete the old token
    await db.token.deleteToken(token);

    // Create a new token
    const newTokenData = await db.token.createToken(user.id);

    console.log(`Token refreshed for user: ${user.username} (${user.id})`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newTokenData.token,
      expiresAt: newTokenData.expires_at
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout endpoint to revoke a token
router.post('/logout', async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Missing or invalid authorization header' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(400).json({ error: 'Empty token' });
    }

    // Delete the token from the database
    const result = await db.token.deleteToken(token);

    if (result.deleted) {
      console.log('Token successfully revoked');
      res.json({ success: true, message: 'Logged out successfully' });
    } else {
      console.log('Token not found for logout');
      res.json({ success: true, message: 'Already logged out' });
    }
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Verify authentication for Nginx auth_request
router.get('/verify', async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    // Check if authorization header exists and has the format 'Bearer TOKEN'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    if (!token) {
      console.error('Empty token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate the token against the database
    const tokenData = await db.token.validateToken(token);

    if (!tokenData) {
      console.error('Invalid or expired token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user information
    const user = await db.user.getUserById(tokenData.user_id);

    if (!user) {
      console.error('User not found for token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Set user information headers
    res.setHeader('Remote-User', user.username);
    res.setHeader('Remote-Name', user.username);
    res.setHeader('Remote-Email', user.email || 'user@example.com');

    // Return 200 OK to indicate successful authentication
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
