const mongoose = require('mongoose')

const AttemptSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  selectedOption: String,
  isCorrect: Boolean,
  timestamp: { type: Date, default: Date.now }
});

const TrainingProgressSchema = new mongoose.Schema({
  reading: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  
  },
  listening: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  
  },
  speaking: {
    type: mongoose.Schema.Types.Mixed,
    default: {} 
  },
  salesSpeaking: {
    type: mongoose.Schema.Types.Mixed,
    default: {} 
  },
  mcq: [AttemptSchema],
  completedLevels: [String],
  levelScores: {
    type: Map,
    of: Number
  }
});

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  phone: {
    type: String
  },
  profileImage: {
    data: Buffer,
    contentType: String
  },
  learningProgress: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      softskills: {},
      sales: {},
      product: {}
    })
  },

  trainingProgress: {
    type: TrainingProgressSchema,
    default: () => ({
      reading: {},  
      listening: {}, 
      speaking: {},  
      salesSpeaking: {}, 
      mcq: [],
      completedLevels: [],
      levelScores: {}
    })
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Profile', ProfileSchema);