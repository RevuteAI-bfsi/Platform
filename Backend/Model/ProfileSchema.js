// Training progress schema
const TrainingProgressSchema = new mongoose.Schema({
  // Changed reading from array to Mixed type to support nested object structure
  reading: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  // Default to empty object instead of array
  },
  // Update listening to use the same structure
  listening: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  // Default to empty object instead of array
  },
  // Update speaking to use the same structure
  speaking: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  // Default to empty object instead of array
  },
  // Add salesSpeaking as a separate field
  salesSpeaking: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  // Default to empty object
  },
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
      reading: {},  // Changed default from array to empty object
      listening: {}, // Changed default from array to empty object
      speaking: {},  // Changed default from array to empty object
      salesSpeaking: {}, // New field for sales speaking module
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