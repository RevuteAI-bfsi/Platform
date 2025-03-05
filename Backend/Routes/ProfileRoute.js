const express = require('express');
const router = express.Router();
const User = require('../Model/UserSchema');
const Profile = require('../Model/ProfileSchema');
const multer = require('multer');
const bcrypt = require('bcrypt');

// Use memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all user progress
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching progress for user: ${userId}`);
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      console.log(`No profile found for ${userId}, creating a new one`);
      // Creating a new profile; schema defaults will initialize progress
      profile = new Profile({ user: userId });
      await profile.save();
    }
    
    // Debug what's in the database
    console.log('Profile from database:');
    console.log(JSON.stringify({
      learningProgress: profile.learningProgress || {},
      trainingProgress: profile.trainingProgress || {}
    }, null, 2));
    
    // Ensure we have the expected structure
    const formattedResponse = {
      learningProgress: {
        softskills: profile.learningProgress?.softskills || {},
        sales: profile.learningProgress?.sales || {},
        product: profile.learningProgress?.product || {}
      },
      trainingProgress: profile.trainingProgress || {
        reading: [],
        listening: [],
        speaking: [],
        mcq: [],
        completedLevels: [],
        levelScores: {}
      }
    };
    
    console.log('Formatted response sending to client:');
    console.log(JSON.stringify(formattedResponse, null, 2));
    
    res.json(formattedResponse);
  } catch (error) {
    console.error('Detailed ProfileRoute error:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update learning progress for a specific module
router.put('/learning-progress/:userId', async (req, res) => {
  console.log('Detailed request body:', JSON.stringify(req.body, null, 2));
  try {
    const { userId } = req.params;
    const { module, topic, progress } = req.body;
    
    if (!module || !topic || !progress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Updating progress for user: ${userId}, module: ${module}, topic: ${topic}`);
    console.log('Progress data received:', progress);
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
      console.log('Created new profile for user');
    }
    
    // Initialize nested structures if they don't exist
    if (!profile.learningProgress) {
      profile.learningProgress = {};
    }
    
    // Ensure the module object exists
    if (!profile.learningProgress[module]) {
      profile.learningProgress[module] = {};
    }
    
    // Use direct assignment instead of spread operator
    profile.learningProgress[module][topic] = {
      completed: progress.completed,
      completedAt: progress.completedAt,
      visited: progress.visited,
      lastVisited: new Date()
    };
    
    console.log('Updated profile structure:', JSON.stringify({
      learningProgress: profile.learningProgress
    }, null, 2));
    
    profile.lastActivity = new Date();
    
    // Save with explicit markModified to ensure nested objects are saved
    profile.markModified('learningProgress');
    await profile.save();
    
    console.log('Profile saved successfully');
    
    // Return the full learning progress structure
    res.json({ 
      message: 'Learning progress updated successfully',
      learningProgress: profile.learningProgress
    });
  } catch (error) {
    console.error('Error updating learning progress:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Save training attempt
router.post('/training-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { trainingType, attempt } = req.body;
    
    if (!trainingType || !attempt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    
    // Initialize trainingProgress if missing
    if (!profile.trainingProgress) {
      profile.trainingProgress = {
        reading: [],
        listening: [],
        speaking: [],
        mcq: [],
        completedLevels: [],
        levelScores: {}
      };
    }
    if (!profile.trainingProgress[trainingType]) {
      profile.trainingProgress[trainingType] = [];
    }
    
    // Add the new training attempt with the current date
    profile.trainingProgress[trainingType].push({
      ...attempt,
      date: new Date()
    });
    
    profile.lastActivity = new Date();
    await profile.save();
    
    res.json({ 
      message: 'Training attempt saved successfully',
      attemptId: profile.trainingProgress[trainingType][profile.trainingProgress[trainingType].length - 1]._id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update level completion status
router.put('/level-completion/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { completedLevels, levelScores } = req.body;
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    
    if (completedLevels) {
      profile.trainingProgress.completedLevels = completedLevels;
    }
    
    if (levelScores) {
      profile.trainingProgress.levelScores = levelScores;
    }
    
    profile.lastActivity = new Date();
    await profile.save();
    
    res.json({ 
      message: 'Level completion status updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profileFetchUser/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('username email');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile = await Profile.findOne({ user: userId }).select('phone profileImage');
    let profileImage = '';
    if (profile && profile.profileImage && profile.profileImage.data) {
      profileImage = `data:${profile.profileImage.contentType};base64,${profile.profileImage.data.toString('base64')}`;
    }
    res.json({ 
      username: user.username, 
      email: user.email, 
      phone: profile ? profile.phone : '', 
      profileImage: profileImage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/updateProfileInfo', upload.single('profileImage'), async (req, res) => {
  try {
    const { userId, phone, username, email } = req.body;
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId, phone });
    } else {
      profile.phone = phone;
    }
    if (req.file) {
      profile.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }
    await profile.save();
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/updatePassword/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
