const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import routes
const scriptsRoutes = require('./routes/scripts');
const userRoutes = require('./routes/user');
const ttsRoutes = require('./routes/tts');

// Import passkey routes
let passkeyRoutes;
try {
  // Try Docker path first
  try {
    passkeyRoutes = require('/app/auth/server/passkey-routes');
    console.log('Passkey routes loaded from Docker path');
  } catch (dockerError) {
    // If Docker path fails, try relative path
    passkeyRoutes = require('../auth/server/passkey-routes');
    console.log('Passkey routes loaded from relative path');
  }
} catch (error) {
  console.error('Error loading passkey routes:', error.message);
  // Fallback to a mock passkey routes if the real one can't be loaded
  const express = require('express');
  passkeyRoutes = express.Router();
  passkeyRoutes.get('/supported', (req, res) => {
    res.json({ supported: false, message: 'Passkeys are not available' });
  });

  // Add mock register and authenticate endpoints
  passkeyRoutes.post('/register', (req, res) => {
    res.json({ success: false, error: 'Passkeys are not available' });
  });

  passkeyRoutes.post('/authenticate', (req, res) => {
    res.json({ success: false, error: 'Passkeys are not available' });
  });
}

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Use routes
app.use('/api/scripts', scriptsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/passkey', passkeyRoutes);
app.use('/api/tts', ttsRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
