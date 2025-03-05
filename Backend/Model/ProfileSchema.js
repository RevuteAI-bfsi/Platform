const mongoose = require('mongoose');

// Individual topic progress schema
const TopicProgressSchema = new mongoose.Schema({
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  lastVisited: Date,
  visited: {
    type: Boolean,
    default: false
  }
}, { _id: false }); // Important: Don't create _id for subdocuments

// Training attempt schema
const AttemptSchema = new mongoose.Schema({
  exerciseId: String,
  title: String,
  date: {
    type: Date,
    default: Date.now
  },
  score: Number,
  transcript: String,
  metrics: mongoose.Schema.Types.Mixed  // For detailed metrics
});

// Training progress schema
const TrainingProgressSchema = new mongoose.Schema({
  reading: [AttemptSchema],
  listening: [AttemptSchema],
  speaking: [AttemptSchema],
  mcq: [AttemptSchema],
  // For storing completion status by level
  completedLevels: [String],
  levelScores: {
    type: Map,
    of: Number
  }
});

// Use Mixed type instead of Map for better compatibility with frontend
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
  // Simplified learning progress structure for better compatibility
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
      reading: [],
      listening: [],
      speaking: [],
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