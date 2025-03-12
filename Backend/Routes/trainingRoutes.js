// server/routes/trainingRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const TrainingResult = require('../models/TrainingResult');

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

// Get all training results for current user
router.get('/', auth, async (req, res) => {
  try {
    const results = await TrainingResult.find({ user: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(results);
  } catch (error) {
    console.error('Training results retrieval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get training results by type
router.get('/:trainingType', auth, async (req, res) => {
  try {
    const { trainingType } = req.params;
    
    const results = await TrainingResult.find({ 
      user: req.userId,
      trainingType
    }).sort({ createdAt: -1 });
    
    res.json(results);
  } catch (error) {
    console.error('Training type results retrieval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save reading training result
router.post('/reading', auth, async (req, res) => {
  try {
    const { contentId, contentTitle, transcript, score } = req.body;
    
    const newResult = new TrainingResult({
      user: req.userId,
      trainingType: 'reading',
      contentId,
      contentTitle,
      transcript,
      score,
      metadata: {
        wordCount: transcript.split(/\s+/).filter(w => w.trim().length > 0).length
      }
    });
    
    await newResult.save();
    
    res.status(201).json({
      message: 'Reading result saved successfully',
      result: newResult
    });
  } catch (error) {
    console.error('Reading result save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save listening training result
router.post('/listening', auth, async (req, res) => {
  try {
    const { contentId, contentTitle, userAnswer, score } = req.body;
    
    const newResult = new TrainingResult({
      user: req.userId,
      trainingType: 'listening',
      contentId,
      contentTitle,
      userAnswer,
      score,
      metadata: {
        wordCount: userAnswer.split(/\s+/).filter(w => w.trim().length > 0).length
      }
    });
    
    await newResult.save();
    
    res.status(201).json({
      message: 'Listening result saved successfully',
      result: newResult
    });
  } catch (error) {
    console.error('Listening result save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save speaking training result
router.post('/speaking', auth, async (req, res) => {
  try {
    const { contentId, contentTitle, transcript, score, metadata } = req.body;
    
    const newResult = new TrainingResult({
      user: req.userId,
      trainingType: 'speaking',
      contentId,
      contentTitle,
      transcript,
      score,
      metadata: {
        wordCount: transcript.split(/\s+/).filter(w => w.trim().length > 0).length,
        keyPointsCovered: metadata?.keyPointsCovered,
        totalKeyPoints: metadata?.totalKeyPoints
      }
    });
    
    await newResult.save();
    
    res.status(201).json({
      message: 'Speaking result saved successfully',
      result: newResult
    });
  } catch (error) {
    console.error('Speaking result save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific training result
router.get('/result/:resultId', auth, async (req, res) => {
  try {
    const { resultId } = req.params;
    
    const result = await TrainingResult.findOne({
      _id: resultId,
      user: req.userId
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Training result not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Training result retrieval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;