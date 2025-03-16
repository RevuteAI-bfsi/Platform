const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  overallAverageScoreReadingSection: {
    type: Number,
    default: 0
  },
  overallAverageScoreListeningWritingSection: {
    type: Number,
    default: 0
  },
  overallAverageScoreSpeakingPractice: {
    type: Number,
    default: 0
  },
  overallAverageScore: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
