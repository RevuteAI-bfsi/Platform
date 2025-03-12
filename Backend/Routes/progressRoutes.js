// server/routes/progressRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Progress = require('../models/Progress');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all progress for current user
router.get('/', auth, async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.userId });
    res.json(progress);
  } catch (error) {
    console.error('Progress retrieval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress for specific content type
router.get('/:contentType', auth, async (req, res) => {
  try {
    const { contentType } = req.params;
    
    let progress = await Progress.findOne({ 
      user: req.userId,
      contentType
    });
    
    // If progress doesn't exist, create it
    if (!progress) {
      progress = new Progress({
        user: req.userId,
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

// Update progress for specific content type
router.put('/:contentType', auth, async (req, res) => {
  try {
    const { contentType } = req.params;
    const { progress, completed } = req.body;
    
    let progressRecord = await Progress.findOne({ 
      user: req.userId,
      contentType
    });
    
    // If progress doesn't exist, create it
    if (!progressRecord) {
      progressRecord = new Progress({
        user: req.userId,
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