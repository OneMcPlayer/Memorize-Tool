const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passkeyRoutes = require('/app/auth/server/passkey-routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/passkey', passkeyRoutes);

// Basic route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// User routes
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mock scripts endpoint
app.get('/api/scripts', (req, res) => {
  res.json([
    { id: 1, title: 'Sample Script 1', description: 'A sample script for testing' },
    { id: 2, title: 'Sample Script 2', description: 'Another sample script' }
  ]);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
