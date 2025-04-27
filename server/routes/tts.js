/**
 * TTS Routes
 *
 * This module provides routes for text-to-speech functionality with caching.
 * It caches TTS audio on the server to reduce API calls and costs.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

// Create cache directory if it doesn't exist
const cacheDir = path.join(__dirname, '../cache/tts');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

/**
 * Generate a hash for the cache key
 * @param {string} text - The text to convert to speech
 * @param {string} voice - The voice to use
 * @param {number} speed - The speed of the speech
 * @param {string} model - The TTS model to use
 * @returns {string} A hash to use as the cache key
 */
function generateCacheKey(text, voice, speed, model) {
  const data = `${text}_${voice}_${speed}_${model}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Check if a file exists in the cache
 * @param {string} cacheKey - The cache key
 * @returns {boolean} True if the file exists, false otherwise
 */
function checkCache(cacheKey) {
  const filePath = path.join(cacheDir, `${cacheKey}.mp3`);
  return fs.existsSync(filePath);
}

/**
 * Get a file from the cache
 * @param {string} cacheKey - The cache key
 * @returns {Buffer} The file data
 */
function getFromCache(cacheKey) {
  const filePath = path.join(cacheDir, `${cacheKey}.mp3`);
  return fs.readFileSync(filePath);
}

/**
 * Save a file to the cache
 * @param {string} cacheKey - The cache key
 * @param {Buffer} data - The file data
 */
function saveToCache(cacheKey, data) {
  const filePath = path.join(cacheDir, `${cacheKey}.mp3`);
  fs.writeFileSync(filePath, data);
}

/**
 * Proxy route for OpenAI's TTS API with caching
 */
router.post('/speech', async (req, res) => {
  try {
    const { text, voice = 'nova', speed = 1.0, model = 'tts-1-hd', apiKey } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Validate model - only allow specific models
    const allowedModels = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
    const ttsModel = allowedModels.includes(model) ? model : 'tts-1-hd';

    // Generate cache key
    const cacheKey = generateCacheKey(text, voice, speed, ttsModel);

    // Check if we have this in cache
    if (checkCache(cacheKey)) {
      console.log('TTS cache hit for:', text.substring(0, 30) + '...', `(model: ${ttsModel})`);
      const audioData = getFromCache(cacheKey);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      return res.send(audioData);
    }

    // Not in cache, call OpenAI API
    console.log('TTS cache miss for:', text.substring(0, 30) + '...', `(model: ${ttsModel})`);
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ttsModel,
        input: text,
        voice: voice,
        speed: speed,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({
        error: error.error?.message || response.statusText
      });
    }

    // Get audio data
    const audioBuffer = await response.buffer();

    // Save to cache
    saveToCache(cacheKey, audioBuffer);

    // Send response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS proxy error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

module.exports = router;
