const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get all scripts metadata
router.get('/', (req, res) => {
  try {
    // In a real app, this would come from a database
    // For now, we'll return a static list
    const scripts = [
      { id: 'sample-script', title: 'Sample Script', description: 'A sample script for testing' },
      { id: 'romeo-juliet', title: 'Romeo and Juliet', description: 'Shakespeare\'s classic tragedy' }
    ];
    
    res.json(scripts);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// Get a specific script by ID
router.get('/:id', (req, res) => {
  try {
    const scriptId = req.params.id;
    
    // In a real app, you would fetch this from a database
    // For now, we'll return mock data
    if (scriptId === 'sample-script') {
      const scriptContent = `
TITLE: Sample Script
AUTHOR: Demo Author

ROLES:
ALICE - The protagonist
BOB - Alice's friend
NARRATOR - Storyteller

SCENE 1: A park bench

NARRATOR: It was a bright and sunny day in the park.

ALICE: (excited) What a beautiful day for a walk!

BOB: Indeed! I've been looking forward to getting outside all week.

ALICE: Did you bring the picnic basket?

BOB: (patting his bag) Got it right here. I packed your favorite sandwiches.

ALICE: You're the best, Bob! Let's find a spot under that big oak tree.

NARRATOR: They walked together toward the ancient oak tree, its branches providing perfect shade from the midday sun.
      `;
      
      res.json({ 
        id: scriptId, 
        title: 'Sample Script', 
        author: 'Demo Author',
        content: scriptContent 
      });
    } else {
      res.status(404).json({ error: 'Script not found' });
    }
  } catch (error) {
    console.error(`Error fetching script ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

// Add a new script
router.post('/', (req, res) => {
  try {
    const { title, author, content } = req.body;
    
    // Validate input
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // In a real app, you would save this to a database
    // For now, we'll just return success with a mock ID
    const newScriptId = 'script-' + Date.now();
    
    res.status(201).json({ 
      id: newScriptId,
      title,
      author,
      message: 'Script created successfully' 
    });
  } catch (error) {
    console.error('Error creating script:', error);
    res.status(500).json({ error: 'Failed to create script' });
  }
});

module.exports = router;
