const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');

// Get all progress for current user
router.get('/', async (req, res) => {
  try {
    // Use req.query.userId or a default for testing
    const userId = req.query.userId || 'defaultUserId';
    const progress = await Progress.find({ user: userId });
    res.json(progress);
  } catch (error) {
    console.error('Progress retrieval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress for a specific content type
router.get('/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const userId = req.query.userId || 'defaultUserId';
    
    let progress = await Progress.findOne({ 
      user: userId,
      contentType
    });
    
    // If progress doesn't exist, create it
    if (!progress) {
      progress = new Progress({
        user: userId,
        contentType,
        progress: 0,
        completed: false
      });
      
      await progress.save();
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Content progress retrieval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update progress for a specific content type
router.put('/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const { progress, completed } = req.body;
    const userId = req.query.userId || 'defaultUserId';
    
    let progressRecord = await Progress.findOne({ 
      user: userId,
      contentType
    });
    
    // If progress doesn't exist, create it
    if (!progressRecord) {
      progressRecord = new Progress({
        user: userId,
        contentType,
        progress: progress || 0,
        completed: completed || false
      });
    } else {
      // Update existing record
      if (progress !== undefined) progressRecord.progress = progress;
      if (completed !== undefined) progressRecord.completed = completed;
      progressRecord.lastAccessed = Date.now();
      progressRecord.updatedAt = Date.now();
    }
    
    await progressRecord.save();
    
    res.json(progressRecord);
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
