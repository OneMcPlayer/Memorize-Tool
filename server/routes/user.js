const express = require('express');
const router = express.Router();
const db = require('../../auth/server/db');

// Helper to validate bearer token and load user data
async function requireAuth(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Not authenticated' });
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return null;
    }

    const tokenData = await db.token.validateToken(token);
    if (!tokenData) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return null;
    }

    const user = await db.user.getUserById(tokenData.user_id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return null;
    }

    return { tokenData, user };
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return null;
  }
}

// User information endpoint
router.get('/', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { user } = auth;
    const settings = await db.userSettings.getSettings(user.id);

    const username = user.username || req.headers['remote-user'] || 'passkey-user';
    const displayName = req.headers['remote-name'] || user.username || 'Passkey User';
    const email = user.email || req.headers['remote-email'] || 'user@example.com';
    const groups = req.headers['remote-groups'] ? req.headers['remote-groups'].split(',') : [];

    res.json({
      username,
      displayName,
      email,
      groups,
      isAuthenticated: true,
      openaiApiKey: settings?.openai_api_key || null
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

// Save or update the OpenAI API key for the authenticated user
router.put('/api-key', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    await db.userSettings.setOpenAiApiKey(auth.user.id, apiKey.trim());
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

// Delete the stored OpenAI API key
router.delete('/api-key', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    await db.userSettings.clearOpenAiApiKey(auth.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
