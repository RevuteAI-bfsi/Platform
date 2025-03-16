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

// Save reading attempt with the new structure
router.post('/reading-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { passageId, title, attemptData, isFirstCompletion } = req.body;
    
    if (!passageId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Saving reading attempt for user: ${userId}, passage: ${passageId}`);
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    
    // Ensure trainingProgress exists
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    
    // Ensure reading object exists (not array)
    if (!profile.trainingProgress.reading || Array.isArray(profile.trainingProgress.reading)) {
      // Convert from array to object if needed
      const oldData = Array.isArray(profile.trainingProgress.reading) ? 
                      profile.trainingProgress.reading : [];
      
      // Initialize as object
      profile.trainingProgress.reading = {};
      
      // Migrate old data to new structure
      oldData.forEach(oldAttempt => {
        if (oldAttempt.passageId) {
          // Create passage entry if it doesn't exist
          if (!profile.trainingProgress.reading[oldAttempt.passageId]) {
            profile.trainingProgress.reading[oldAttempt.passageId] = {
              id: oldAttempt.passageId,
              title: oldAttempt.title || "Unknown Passage",
              attempts_count: 0,
              metrics: []
            };
          }
          
          // Add the old attempt data to metrics array
          profile.trainingProgress.reading[oldAttempt.passageId].metrics.push({
            timestamp: oldAttempt.date || new Date().toISOString(),
            passage_complete: (oldAttempt.accuracy || 0) > 70,
            transcript: oldAttempt.transcript || "",
            overall_score: Math.round((oldAttempt.accuracy || 0) / 100 * 9),
            percentage_score: oldAttempt.accuracy || 0,
            // Other fields from old structure
          });
          
          // Increment attempt count
          profile.trainingProgress.reading[oldAttempt.passageId].attempts_count++;
        }
      });
    }
    
    // Ensure this passage exists in the structure
    if (!profile.trainingProgress.reading[passageId]) {
      profile.trainingProgress.reading[passageId] = {
        id: passageId,
        title: title,
        attempts_count: 0,
        metrics: []
      };
    }
    
    // Critical fix: APPEND to the metrics array, not replace it
    profile.trainingProgress.reading[passageId].metrics.push(attemptData);
    profile.trainingProgress.reading[passageId].attempts_count++;
    
    // Update last activity
    profile.lastActivity = new Date();
    
    // Mark the modification to ensure MongoDB updates nested objects
    profile.markModified('trainingProgress');
    await profile.save();
    
    res.json({
      message: 'Reading attempt saved successfully',
      passageId,
      timestamp: attemptData.timestamp
    });
  } catch (error) {
    console.error('Error saving reading attempt:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Save speaking attempt with the new structure
router.post('/speaking-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { topicId, title, attemptData, isFirstCompletion } = req.body;
    
    if (!topicId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Saving speaking attempt for user: ${userId}, topic: ${topicId}`);
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    
    // Ensure trainingProgress exists
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    
    // Convert from array to object if needed
    if (!profile.trainingProgress.speaking || Array.isArray(profile.trainingProgress.speaking)) {
      // Convert from array to object if needed
      const oldData = Array.isArray(profile.trainingProgress.speaking) ? 
                      profile.trainingProgress.speaking : [];
      
      // Initialize as object
      profile.trainingProgress.speaking = {};
      
      // Migrate old data to new structure
      oldData.forEach(oldAttempt => {
        if (oldAttempt.topicId) {
          // Create topic entry if it doesn't exist
          if (!profile.trainingProgress.speaking[oldAttempt.topicId]) {
            profile.trainingProgress.speaking[oldAttempt.topicId] = {
              id: oldAttempt.topicId,
              title: oldAttempt.title || "Unknown Topic",
              attempts_count: 0,
              metrics: []
            };
          }
          
          // Add the old attempt data to metrics array
          profile.trainingProgress.speaking[oldAttempt.topicId].metrics.push({
            timestamp: oldAttempt.date || new Date().toISOString(),
            transcript: oldAttempt.transcript || "",
            overall_score: Math.round((oldAttempt.score || 0) / 100 * 9),
            percentage_score: oldAttempt.score || 0,
            // Other fields from old structure
          });
          
          // Increment attempt count
          profile.trainingProgress.speaking[oldAttempt.topicId].attempts_count++;
        }
      });
    }
    
    // Ensure this topic exists in the structure
    if (!profile.trainingProgress.speaking[topicId]) {
      profile.trainingProgress.speaking[topicId] = {
        id: topicId,
        title: title,
        attempts_count: 0,
        metrics: []
      };
    }
    
    // APPEND to metrics array (not replace)
    profile.trainingProgress.speaking[topicId].metrics.push(attemptData);
    profile.trainingProgress.speaking[topicId].attempts_count++;
    
    // Update last activity
    profile.lastActivity = new Date();
    
    // Mark the modification to ensure MongoDB updates nested objects
    profile.markModified('trainingProgress');
    await profile.save();
    
    res.json({
      message: 'Speaking attempt saved successfully',
      topicId,
      timestamp: attemptData.timestamp
    });
  } catch (error) {
    console.error('Error saving speaking attempt:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Save listening attempt with the new structure
router.post('/listening-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { exerciseId, title, attemptData, isFirstCompletion } = req.body;
    
    if (!exerciseId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Saving listening attempt for user: ${userId}, exercise: ${exerciseId}`);
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    
    // Ensure trainingProgress exists
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    
    // Convert from array to object if needed
    if (!profile.trainingProgress.listening || Array.isArray(profile.trainingProgress.listening)) {
      // Convert from array to object if needed
      const oldData = Array.isArray(profile.trainingProgress.listening) ? 
                      profile.trainingProgress.listening : [];
      
      // Initialize as object
      profile.trainingProgress.listening = {};
      
      // Migrate old data to new structure
      oldData.forEach(oldAttempt => {
        if (oldAttempt.exerciseId) {
          // Create exercise entry if it doesn't exist
          if (!profile.trainingProgress.listening[oldAttempt.exerciseId]) {
            profile.trainingProgress.listening[oldAttempt.exerciseId] = {
              id: oldAttempt.exerciseId,
              title: oldAttempt.title || "Unknown Exercise",
              attempts_count: 0,
              metrics: []
            };
          }
          
          // Add the old attempt data to metrics array
          profile.trainingProgress.listening[oldAttempt.exerciseId].metrics.push({
            timestamp: oldAttempt.date || new Date().toISOString(),
            transcript: oldAttempt.transcript || "",
            overall_score: Math.round((oldAttempt.score || 0) / 100 * 9),
            percentage_score: oldAttempt.score || 0,
            // Other fields from old structure
          });
          
          // Increment attempt count
          profile.trainingProgress.listening[oldAttempt.exerciseId].attempts_count++;
        }
      });
    }
    
    // Ensure this exercise exists in the structure
    if (!profile.trainingProgress.listening[exerciseId]) {
      profile.trainingProgress.listening[exerciseId] = {
        id: exerciseId,
        title: title,
        attempts_count: 0,
        metrics: []
      };
    }
    
    // APPEND to metrics array (not replace)
    profile.trainingProgress.listening[exerciseId].metrics.push(attemptData);
    profile.trainingProgress.listening[exerciseId].attempts_count++;
    
    // Update last activity
    profile.lastActivity = new Date();
    
    // Mark the modification to ensure MongoDB updates nested objects
    profile.markModified('trainingProgress');
    await profile.save();
    
    res.json({
      message: 'Listening attempt saved successfully',
      exerciseId,
      timestamp: attemptData.timestamp
    });
  } catch (error) {
    console.error('Error saving listening attempt:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

// Save sales speaking attempt with the new structure
router.post('/sales-speaking-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { questionId, question, attemptData, isFirstCompletion } = req.body;
    
    if (!questionId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Saving sales speaking attempt for user: ${userId}, question: ${questionId}`);
    
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    
    // Ensure trainingProgress exists
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    
    // Ensure salesSpeaking object exists
    if (!profile.trainingProgress.salesSpeaking) {
      profile.trainingProgress.salesSpeaking = {};
    }
    
    // Ensure this question exists in the structure
    if (!profile.trainingProgress.salesSpeaking[questionId]) {
      profile.trainingProgress.salesSpeaking[questionId] = {
        id: questionId,
        question: question,
        attempts_count: 0,
        metrics: []
      };
    }
    
    // APPEND to metrics array (not replace)
    profile.trainingProgress.salesSpeaking[questionId].metrics.push(attemptData);
    profile.trainingProgress.salesSpeaking[questionId].attempts_count++;
    
    // Update last activity
    profile.lastActivity = new Date();
    
    // Mark the modification to ensure MongoDB updates nested objects
    profile.markModified('trainingProgress');
    await profile.save();
    
    res.json({
      message: 'Sales speaking attempt saved successfully',
      questionId,
      timestamp: attemptData.timestamp
    });
  } catch (error) {
    console.error('Error saving sales speaking attempt:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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