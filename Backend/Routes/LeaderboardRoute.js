const express = require("express");
const router = express.Router();
const Leaderboard = require("../Model/LeaderBoardSchema");

router.post('/updateLeaderboard', async (req, res) => {
  try {
    const { 
      userId, 
      username, 
      adminName, 
      overallReadingAverage, 
      overallListeningAverage, 
      overallSpeakingAverage, 
      overallSalesSpeakingPractice, 
      overallProductMcq 
    } = req.body;
    if (!userId || !username || !adminName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let record = await Leaderboard.findOne({ userId });
    if (!record) {
      record = new Leaderboard({
        userId,
        username,
        adminName,
        overallAverageScoreReadingSection: overallReadingAverage,
        overallAverageScoreListeningWritingSection: overallListeningAverage,
        overallAverageScoreSpeakingPractice: overallSpeakingAverage,
        overallAverageScoreSalesSpeakingPractice: overallSalesSpeakingPractice,
        overallAverageScoreProductMcq: overallProductMcq
      });
    } else {
      record.username = username;
      record.adminName = adminName;
      record.overallAverageScoreReadingSection = overallReadingAverage;
      record.overallAverageScoreListeningWritingSection = overallListeningAverage;
      record.overallAverageScoreSpeakingPractice = overallSpeakingAverage;
      record.overallAverageScoreSalesSpeakingPractice = overallSalesSpeakingPractice;
      record.overallAverageScoreProductMcq = overallProductMcq;
    }
    await record.save();
    res.json({ message: 'Leaderboard updated successfully', leaderboard: record });
  } catch (error) {
    console.error("Error updating leaderboard:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/fetchUser-leaderBoard', async (req, res) => {
  try {
    const records = await Leaderboard.find({}).sort({ overallScore: -1 });
    res.json(records);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/fetchAdminLeaderboard/:adminName', async (req, res) => {
  try {
    const { adminName } = req.params;
    const leaderboardData = await Leaderboard.find({ adminName }).select(
      'userId username overallAverageScoreReadingSection overallAverageScoreListeningWritingSection overallAverageScoreSpeakingPractice overallAverageScoreSalesSpeakingPractice overallAverageScoreProductMcq overallScore'
    );
    res.status(200).json(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    res.status(500).json({ error: "Error fetching leaderboard data" });
  }
});

module.exports = router;
