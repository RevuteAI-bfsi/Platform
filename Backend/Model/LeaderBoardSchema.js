const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    ref: 'User' 
  },
  username: {
    type: String,
    required: true,
  },
  adminName: {
    type: String,
    required: true,
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
  overallScore: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

leaderboardSchema.pre('save', function(next) {
  this.overallScore = (
    (this.overallAverageScoreReadingSection +
     this.overallAverageScoreListeningWritingSection +
     this.overallAverageScoreSpeakingPractice) / 3
  );
  next();
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
