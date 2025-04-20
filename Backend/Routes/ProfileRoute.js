const express = require('express');
const router = express.Router();
const User = require('../Model/UserSchema');
const Profile = require('../Model/ProfileSchema');
const multer = require('multer');
const bcrypt = require('bcrypt');
const authMiddleware = require('../Middleware/Auth');
const jwt = require('jsonwebtoken');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/check-auth', authMiddleware, (req, res) => {
  try {
    // Check if user object exists in the expected structure
    if (!req.user) {
      console.log('Auth check failed: req.user is undefined');
      return res.status(200).json({ isAuthenticated: false, message: 'No user found in request' });
    }
    
    // Handle different token structures - some might have req.user.id, others req.user.user.id
    let userId;
    if (req.user.user && req.user.user.id) {
      userId = req.user.user.id;
    } else if (req.user.id) {
      userId = req.user.id;
    } else {
      console.log('Auth check failed: Could not find user ID in token');
      return res.status(200).json({ isAuthenticated: false, message: 'User ID not found in token' });
    }
    
    // If we've reached this point, authentication was successful
    console.log('Auth check successful for user:', userId);
    return res.status(200).json({ isAuthenticated: true, userId: userId });
  } catch (error) {
    console.error('Error in check-auth endpoint:', error);
    return res.status(200).json({ isAuthenticated: false, message: 'Authentication check failed' });
  }
});

router.get('/public-auth-check', (req, res) => {
  try {
    // Check for token in cookies
    const token = req.cookies?.token;
    console.log('Public auth check - Token from cookies:', token ? 'Found' : 'Not found');

    if (!token) {
      return res.status(200).json({ isAuthenticated: false, message: 'No token found' });
    }

    try {
      // Verify the token
      const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
      const decoded = jwt.verify(token, jwtSecret);
      
      // Get the user ID from the token
      let userId;
      if (decoded.user && decoded.user.id) {
        userId = decoded.user.id;
      } else if (decoded.id) {
        userId = decoded.id;
      } else {
        return res.status(200).json({ isAuthenticated: false, message: 'User ID not found in token' });
      }
      
      console.log('Public auth check successful for user:', userId);
      return res.status(200).json({ isAuthenticated: true, userId });
    } catch (tokenError) {
      console.error('Public auth check - Token verification error:', tokenError.message);
      return res.status(200).json({ isAuthenticated: false, message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error in public-auth-check endpoint:', error);
    return res.status(200).json({ isAuthenticated: false, message: 'Authentication check failed' });
  }
});

router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.user.id;
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
      await profile.save();
    }
    const formattedResponse = {
      learningProgress: {
        softskills: profile.learningProgress?.softskills || {},
        sales: profile.learningProgress?.sales || {},
        product: profile.learningProgress?.product || {}
      },
      trainingProgress: profile.trainingProgress || {
        reading: {},
        listening: {},
        speaking: {},
        salesSpeaking: {},
        mcq: [],
        completedLevels: [],
        levelScores: {}
      }
    };

    let totalPassageAverage = 0;
    let passageCount = 0;
    if (formattedResponse.trainingProgress.reading && typeof formattedResponse.trainingProgress.reading === 'object') {
      for (const passageId in formattedResponse.trainingProgress.reading) {
        const passageData = formattedResponse.trainingProgress.reading[passageId];
        if (passageData && Array.isArray(passageData.metrics)) {
          const sum = passageData.metrics.reduce((acc, attempt) => acc + (attempt.overall_score || 0), 0);
          const avg = passageData.metrics.length > 0 ? sum / passageData.metrics.length : 0;
          passageData.averageScore = avg;
          totalPassageAverage += avg;
        }
        passageCount++;
      }
    }
    const overallReadingAverage = passageCount > 0 ? totalPassageAverage / passageCount : 0;
    formattedResponse.overallReadingAverage = overallReadingAverage;

    let totalExerciseAverage = 0;
    let exerciseCount = 0;
    if (formattedResponse.trainingProgress.listening && typeof formattedResponse.trainingProgress.listening === 'object') {
      for (const exerciseId in formattedResponse.trainingProgress.listening) {
        const exerciseData = formattedResponse.trainingProgress.listening[exerciseId];
        if (exerciseData && Array.isArray(exerciseData.metrics)) {
          const sum = exerciseData.metrics.reduce((acc, attempt) => acc + (attempt.overall_score || 0), 0);
          const avg = exerciseData.metrics.length > 0 ? sum / exerciseData.metrics.length : 0;
          exerciseData.averageScore = avg;
          totalExerciseAverage += avg;
        }
        exerciseCount++;
      }
    }
    const overallListeningAverage = exerciseCount > 0 ? totalExerciseAverage / exerciseCount : 0;
    formattedResponse.overallListeningAverage = overallListeningAverage;

    let totalTopicAverage = 0;
    let topicCount = 0;
    if (formattedResponse.trainingProgress.speaking && typeof formattedResponse.trainingProgress.speaking === 'object') {
      for (const topicId in formattedResponse.trainingProgress.speaking) {
        const topicData = formattedResponse.trainingProgress.speaking[topicId];
        if (topicData && Array.isArray(topicData.metrics)) {
          const sum = topicData.metrics.reduce((acc, attempt) => acc + (attempt.overall_score || 0), 0);
          const avg = topicData.metrics.length > 0 ? sum / topicData.metrics.length : 0;
          topicData.averageScore = avg;
          totalTopicAverage += avg;
        }
        topicCount++;
      }
    }
    const overallSpeakingAverage = topicCount > 0 ? totalTopicAverage / topicCount : 0;
    formattedResponse.overallSpeakingAverage = overallSpeakingAverage;

    let totalSalesSpeakingAverage = 0;
    let salesSpeakingCount = 0;
    if (formattedResponse.trainingProgress.salesSpeaking && typeof formattedResponse.trainingProgress.salesSpeaking === 'object') {
      for (const questionId in formattedResponse.trainingProgress.salesSpeaking) {
        const salesData = formattedResponse.trainingProgress.salesSpeaking[questionId];
        if (salesData && Array.isArray(salesData.metrics)) {
          const sum = salesData.metrics.reduce((acc, attempt) => acc + (attempt.overall_score || 0), 0);
          const avg = salesData.metrics.length > 0 ? sum / salesData.metrics.length : 0;
          salesData.averageScore = avg;
          totalSalesSpeakingAverage += avg;
        }
        salesSpeakingCount++;
      }
    }
    const overallSalesSpeakingAverage = salesSpeakingCount > 0 ? totalSalesSpeakingAverage / salesSpeakingCount : 0;
    formattedResponse.overallSalesSpeakingAverage = overallSalesSpeakingAverage;

    let totalMCQAttempts = 0;
    let totalCorrectMCQs = 0;
    if (Array.isArray(formattedResponse.trainingProgress.mcq)) {
      totalMCQAttempts = formattedResponse.trainingProgress.mcq.length;
      totalCorrectMCQs = formattedResponse.trainingProgress.mcq.reduce(
        (acc, attempt) => acc + (attempt.isCorrect ? 1 : 0),
        0
      );
    }
    const overallMCQAverage = totalMCQAttempts > 0 ? (totalCorrectMCQs / totalMCQAttempts)  : 0;
    formattedResponse.overallMCQAverage = overallMCQAverage;

    res.json(formattedResponse);
  } catch (error) {
    console.error("Detailed ProfileRoute error:", error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

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

router.post("/training-attempt/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { trainingType, attempt } = req.body;
    if (!trainingType || !attempt) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
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
    if (trainingType === "mcq") {
      const questionId = attempt.questionId;
      const existingAttempts = profile.trainingProgress.mcq.filter(
        (a) => String(a.questionId) === String(questionId)
      );
      if (existingAttempts.length >= 3) {
        return res.status(200).json({
          message: "Maximum attempts reached for this question. New attempt not saved.",
          stored: false
        });
      }
    }
    profile.trainingProgress[trainingType].push({
      ...attempt,
      date: new Date()
    });
    profile.lastActivity = new Date();
    profile.markModified("trainingProgress");
    await profile.save();
    res.json({
      message: "Training attempt saved successfully",
      stored: true,
      attemptId:
        profile.trainingProgress[trainingType][
          profile.trainingProgress[trainingType].length - 1
        ]._id
    });
  } catch (error) {
    console.error("Error saving training attempt:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

router.post('/reading-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { passageId, title, attemptData, isFirstCompletion } = req.body;
    if (!passageId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    if (!profile.trainingProgress.reading || Array.isArray(profile.trainingProgress.reading)) {
      const oldData = Array.isArray(profile.trainingProgress.reading) ? profile.trainingProgress.reading : [];
      profile.trainingProgress.reading = {};
      oldData.forEach(oldAttempt => {
        if (oldAttempt.passageId) {
          if (!profile.trainingProgress.reading[oldAttempt.passageId]) {
            profile.trainingProgress.reading[oldAttempt.passageId] = {
              id: oldAttempt.passageId,
              title: oldAttempt.title || "Unknown Passage",
              attempts_count: 0,
              metrics: []
            };
          }
          profile.trainingProgress.reading[oldAttempt.passageId].metrics.push({
            timestamp: oldAttempt.date || new Date().toISOString(),
            passage_complete: (oldAttempt.accuracy || 0) > 70,
            transcript: oldAttempt.transcript || "",
            overall_score: Math.round((oldAttempt.accuracy || 0) / 100 * 9),
            percentage_score: oldAttempt.accuracy || 0
          });
          profile.trainingProgress.reading[oldAttempt.passageId].attempts_count++;
        }
      });
    }
    if (!profile.trainingProgress.reading[passageId]) {
      profile.trainingProgress.reading[passageId] = {
        id: passageId,
        title: title,
        attempts_count: 0,
        metrics: []
      };
    }
    const maxAttempts = req.body.maxAttempts || 3;
    if (profile.trainingProgress.reading[passageId].metrics.length < maxAttempts) {
      profile.trainingProgress.reading[passageId].metrics.push(attemptData);
      profile.trainingProgress.reading[passageId].attempts_count++;
    } else {
      return res.status(200).json({
        message: 'Maximum attempts reached for this passage. Additional attempt not stored in DB.',
        passageId
      });
    }
    profile.lastActivity = new Date();
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

router.post('/speaking-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { topicId, title, attemptData, isFirstCompletion } = req.body;
    if (!topicId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    if (!profile.trainingProgress.speaking || Array.isArray(profile.trainingProgress.speaking)) {
      const oldData = Array.isArray(profile.trainingProgress.speaking)
        ? profile.trainingProgress.speaking
        : [];
      profile.trainingProgress.speaking = {};
      oldData.forEach(oldAttempt => {
        if (oldAttempt.topicId) {
          if (!profile.trainingProgress.speaking[oldAttempt.topicId]) {
            profile.trainingProgress.speaking[oldAttempt.topicId] = {
              id: oldAttempt.topicId,
              title: oldAttempt.title || "Unknown Topic",
              attempts_count: 0,
              metrics: []
            };
          }
          profile.trainingProgress.speaking[oldAttempt.topicId].metrics.push({
            timestamp: oldAttempt.date || new Date().toISOString(),
            transcript: oldAttempt.transcript || "",
            overall_score: Math.round((oldAttempt.score || 0) / 100 * 9),
            percentage_score: oldAttempt.score || 0
          });
          profile.trainingProgress.speaking[oldAttempt.topicId].attempts_count++;
        }
      });
    }
    if (!profile.trainingProgress.speaking[topicId]) {
      profile.trainingProgress.speaking[topicId] = {
        id: topicId,
        title: title,
        attempts_count: 0,
        metrics: []
      };
    }
    const maxAttempts = req.body.maxAttempts || 3;
    if (profile.trainingProgress.speaking[topicId].metrics.length < maxAttempts) {
      profile.trainingProgress.speaking[topicId].metrics.push(attemptData);
      profile.trainingProgress.speaking[topicId].attempts_count++;
    } else {
      return res.status(200).json({
        message: 'Maximum attempts reached for this topic. Additional attempt not stored in DB.',
        topicId
      });
    }
    profile.lastActivity = new Date();
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

router.post('/listening-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { exerciseId, title, attemptData, isFirstCompletion } = req.body;
    if (!exerciseId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    if (!profile.trainingProgress.listening || Array.isArray(profile.trainingProgress.listening)) {
      const oldData = Array.isArray(profile.trainingProgress.listening)
        ? profile.trainingProgress.listening
        : [];
      profile.trainingProgress.listening = {};
      oldData.forEach(oldAttempt => {
        if (oldAttempt.exerciseId) {
          if (!profile.trainingProgress.listening[oldAttempt.exerciseId]) {
            profile.trainingProgress.listening[oldAttempt.exerciseId] = {
              id: oldAttempt.exerciseId,
              title: oldAttempt.title || "Unknown Exercise",
              attempts_count: 0,
              metrics: []
            };
          }
          profile.trainingProgress.listening[oldAttempt.exerciseId].metrics.push({
            timestamp: oldAttempt.date || new Date().toISOString(),
            transcript: oldAttempt.transcript || "",
            overall_score: Math.round((oldAttempt.score || 0) / 100 * 9),
            percentage_score: oldAttempt.score || 0
          });
          profile.trainingProgress.listening[oldAttempt.exerciseId].attempts_count++;
        }
      });
    }
    if (!profile.trainingProgress.listening[exerciseId]) {
      profile.trainingProgress.listening[exerciseId] = {
        id: exerciseId,
        title: title,
        attempts_count: 0,
        metrics: []
      };
    }
    const maxAttempts = req.body.maxAttempts || 3;
    if (profile.trainingProgress.listening[exerciseId].metrics.length < maxAttempts) {
      profile.trainingProgress.listening[exerciseId].metrics.push(attemptData);
      profile.trainingProgress.listening[exerciseId].attempts_count++;
    } else {
      return res.status(200).json({
        message: 'Maximum attempts reached for this exercise. Additional attempt not stored in DB.',
        exerciseId
      });
    }
    profile.lastActivity = new Date();
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

router.get('/profileFetchUser', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user.id;
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

router.put('/updateProfileInfo' , authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { phone, username, email } = req.body;
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

router.post('/sales-speaking-attempt/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { questionId, question, attemptData, isFirstCompletion } = req.body;
    if (!questionId || !attemptData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId });
    }
    if (!profile.trainingProgress) {
      profile.trainingProgress = {};
    }
    if (!profile.trainingProgress.salesSpeaking) {
      profile.trainingProgress.salesSpeaking = {};
    }
    if (!profile.trainingProgress.salesSpeaking[questionId]) {
      profile.trainingProgress.salesSpeaking[questionId] = {
        id: questionId,
        question: question,
        attempts_count: 0,
        metrics: []
      };
    }
    const maxAttempts = req.body.maxAttempts || 3;
    if (profile.trainingProgress.salesSpeaking[questionId].metrics.length < maxAttempts) {
      profile.trainingProgress.salesSpeaking[questionId].metrics.push(attemptData);
      profile.trainingProgress.salesSpeaking[questionId].attempts_count++;
      profile.lastActivity = new Date();
      profile.markModified('trainingProgress');
      await profile.save();
      return res.json({
        message: 'Sales speaking attempt saved successfully',
        questionId,
        timestamp: attemptData.timestamp
      });
    } else {
      return res.status(200).json({
        message: 'Maximum attempts reached for this question. Additional attempt not stored in DB.',
        questionId
      });
    }
  } catch (error) {
    console.error('Error saving sales speaking attempt:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/updatePassword', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user.id;
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

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
