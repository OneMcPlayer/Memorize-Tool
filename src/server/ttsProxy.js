/**
 * TTS Proxy Server
 * 
 * This is a simple Express server that acts as a proxy for TTS services
 * to avoid CORS issues. It can be used in development or deployed as a serverless function.
 * 
 * To use in development:
 * 1. Install Express: npm install express cors axios
 * 2. Run this file: node ttsProxy.js
 * 
 * For production, this can be adapted to a serverless function (AWS Lambda, Vercel, etc.)
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Google Translate TTS proxy endpoint
app.get('/api/tts-proxy', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.query;
    
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }
    
    // Create the Google Translate TTS URL
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
    
    // Fetch the audio file
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Pipe the audio stream to the response
    response.data.pipe(res);
  } catch (error) {
    console.error('TTS Proxy Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch TTS audio' });
  }
});

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`TTS Proxy server running at http://localhost:${port}`);
  });
}

// Export for use in other files
module.exports = app;
