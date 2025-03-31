// src/utils/progressTracker.js
/**
 * Utility functions for tracking and calculating progress across
 * different training modules with compatibility for the new data structure
 */

/**
 * Calculate completion percentage for a specific training type
 * Compatible with both old (array) and new (object) data structures
 * 
 * @param {Object} trainingProgress - The training progress object from the database
 * @param {String} trainingType - Type of training (reading, listening, speaking)
 * @param {Number} threshold - Number of items needed for 100% completion
 * @returns {Number} - Percentage of completion (0-100)
 */
export const calculateTrainingCompletion = (trainingProgress, trainingType, threshold = 5) => {
    if (!trainingProgress) return 0;
    
    // Check if data is in new structure (object with keys) or old structure (array)
    if (typeof trainingProgress[trainingType] === 'object' && !Array.isArray(trainingProgress[trainingType])) {
      // New structure - count unique IDs in the object
      const completedCount = Object.keys(trainingProgress[trainingType] || {}).length;
      return Math.min(Math.round((completedCount / threshold) * 100), 100);
    } else {
      // Old structure - count unique IDs in the array
      const completedIds = Array.isArray(trainingProgress[trainingType]) 
        ? [...new Set(trainingProgress[trainingType].map(item => 
            item.passageId || item.exerciseId || item.topicId))]
        : [];
      return Math.min(Math.round((completedIds.length / threshold) * 100), 100);
    }
  };
  
  /**
   * Check if an item is completed (passage, exercise, topic)
   * 
   * @param {Object} trainingProgress - The training progress object
   * @param {String} trainingType - Type of training (reading, listening, speaking)
   * @param {String} itemId - ID of the passage, exercise, or topic
   * @returns {Boolean} - True if completed, false otherwise
   */
  export const isItemCompleted = (trainingProgress, trainingType, itemId) => {
    if (!trainingProgress || !itemId) return false;
    
    // Check if data is in new structure
    if (typeof trainingProgress[trainingType] === 'object' && !Array.isArray(trainingProgress[trainingType])) {
      // New structure - check if ID exists as key in object
      return !!trainingProgress[trainingType][itemId];
    } else {
      // Old structure - check if ID exists in array
      return Array.isArray(trainingProgress[trainingType]) && 
        trainingProgress[trainingType].some(item => 
          (item.passageId || item.exerciseId || item.topicId) === itemId);
    }
  };
  
  /**
 * Check if user has completed enough of previous module to access current module
 * 
 * @param {Object} trainingProgress - The training progress object
 * @param {String} currentModule - Current module being accessed
 * @param {String} skillType - Type of skill (softskills, sales, product)
 * @param {Number} threshold - Percentage threshold required (0-100)
 * @returns {Object} - {allowed: Boolean, message: String, redirectPath: String}
 */
export const canAccessTrainingModule = (trainingProgress, currentModule, skillType, threshold = 50) => {
  if (!trainingProgress) return {
    allowed: false,
    message: "Unable to load your progress data",
    redirectPath: null
  };
  
  // Learning module is always accessible
  if (currentModule === 'learning') return {
    allowed: true
  };
  
  // Get learning completion status from localStorage
  const learningCompleted = isLearningCompleted(skillType);
  
  // For Reading, only Learning completion is required
  if (currentModule === 'reading') {
    if (!learningCompleted) {
      const learningTopics = getLearningTopicsForSkill(skillType);
      return {
        allowed: false,
        message: "Please complete the Learning module first before accessing Reading Training",
        redirectPath: `/${skillType}/learning/${learningTopics[0]}`
      };
    }
    return { allowed: true };
  }
  
  // For Listening, check if Reading module completion meets threshold
  if (currentModule === 'listening') {
    if (!learningCompleted) {
      const learningTopics = getLearningTopicsForSkill(skillType);
      return {
        allowed: false,
        message: "Please complete the Learning module first",
        redirectPath: `/${skillType}/learning/${learningTopics[0]}`
      };
    }
    
    const readingCompletion = calculateTrainingCompletion(trainingProgress, 'reading', 5);
    if (readingCompletion < threshold) {
      return {
        allowed: false,
        message: `Please complete at least ${threshold}% of the Reading module first (current: ${Math.round(readingCompletion)}%)`,
        redirectPath: `/${skillType}/training/reading`
      };
    }
    
    return { allowed: true };
  }
  
  // For Speaking, check if Listening module completion meets threshold
  if (currentModule === 'speaking') {
    if (!learningCompleted) {
      const learningTopics = getLearningTopicsForSkill(skillType);
      return {
        allowed: false,
        message: "Please complete the Learning module first",
        redirectPath: `/${skillType}/learning/${learningTopics[0]}`
      };
    }
    
    const readingCompletion = calculateTrainingCompletion(trainingProgress, 'reading', 5);
    if (readingCompletion < threshold) {
      return {
        allowed: false,
        message: `Please complete at least ${threshold}% of the Reading module first (current: ${Math.round(readingCompletion)}%)`,
        redirectPath: `/${skillType}/training/reading`
      };
    }
    
    const listeningCompletion = calculateTrainingCompletion(trainingProgress, 'listening', 5);
    if (listeningCompletion < threshold) {
      return {
        allowed: false,
        message: `Please complete at least ${threshold}% of the Listening module first (current: ${Math.round(listeningCompletion)}%)`,
        redirectPath: `/${skillType}/training/listening`
      };
    }
    
    return { allowed: true };
  }
  
  return {
    allowed: false,
    message: "Unknown module type",
    redirectPath: null
  };
};

/**
 * Check if learning is completed for a specific skill type
 * 
 * @param {String} skillType - Type of skill (softskills, sales, product)
 * @returns {Boolean} - True if learning is completed
 */
export const isLearningCompleted = (skillType) => {
  // Check localStorage first (faster)
  const completedTopicsFromStorage = JSON.parse(
    localStorage.getItem(`${skillType}_completed`) || '[]'
  );
  
  // Get the appropriate learning topics for this skill type
  const learningTopics = getLearningTopicsForSkill(skillType);
  
  // Check if all required topics are completed in localStorage
  return learningTopics.every(topic => 
    completedTopicsFromStorage.includes(topic)
  );
};

/**
 * Get learning topics for a specific skill type
 * 
 * @param {String} skillType - Type of skill (softskills, sales, product)
 * @returns {Array} - Array of learning topic IDs
 */
export const getLearningTopicsForSkill = (skillType) => {
  if (skillType === 'sales') {
    return ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
  } else if (skillType === 'product') {
    return ['bank-terminologies', 'casa-kyc', 'personal-loans'];
  } else {
    // Default to softskills
    return ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
  }
};  /**
   * Get all attempt history for a specific item
   * 
   * @param {Object} trainingProgress - The training progress object
   * @param {String} trainingType - Type of training (reading, listening, speaking)
   * @param {String} itemId - ID of the passage, exercise, or topic
   * @returns {Array} - Array of attempt objects
   */
  export const getAttemptHistory = (trainingProgress, trainingType, itemId) => {
    if (!trainingProgress || !itemId) return [];
    
    // Check if data is in new structure
    if (typeof trainingProgress[trainingType] === 'object' && !Array.isArray(trainingProgress[trainingType])) {
      // New structure - get metrics array for the item
      const item = trainingProgress[trainingType][itemId];
      if (item && Array.isArray(item.metrics)) {
        return item.metrics.map(metric => ({
          ...metric,
          itemId,
          title: item.title || item.question,
          date: metric.timestamp,
          score: metric.percentage_score
        }));
      }
      return [];
    } else {
      // Old structure - filter array by item ID
      return Array.isArray(trainingProgress[trainingType])
        ? trainingProgress[trainingType].filter(attempt => 
            (attempt.passageId || attempt.exerciseId || attempt.topicId) === itemId)
        : [];
    }
  };
  
  /**
   * Get best attempt for a specific item
   * 
   * @param {Object} trainingProgress - The training progress object
   * @param {String} trainingType - Type of training (reading, listening, speaking)
   * @param {String} itemId - ID of the passage, exercise, or topic
   * @returns {Object|null} - Best attempt object or null if no attempts
   */
  export const getBestAttempt = (trainingProgress, trainingType, itemId) => {
    const attempts = getAttemptHistory(trainingProgress, trainingType, itemId);
    
    if (attempts.length === 0) return null;
    
    // Find attempt with highest score
    return attempts.reduce((best, current) => {
      const bestScore = best.percentage_score || best.score || 0;
      const currentScore = current.percentage_score || current.score || 0;
      return currentScore > bestScore ? current : best;
    });
  };
  
  /**
   * Store completed training items in localStorage as backup
   * 
   * @param {String} skillType - Type of skill (softskills, sales, product)
   * @param {String} trainingType - Type of training (reading, listening, speaking)
   * @param {Array} completedIds - Array of completed item IDs
   */
  export const storeCompletedItemsLocally = (skillType, trainingType, completedIds) => {
    if (!skillType || !trainingType || !Array.isArray(completedIds)) return;
    
    const key = `${skillType}_${trainingType}_completed`;
    localStorage.setItem(key, JSON.stringify(completedIds));
  };
  
  /**
   * Get completed training items from localStorage
   * 
   * @param {String} skillType - Type of skill (softskills, sales, product)
   * @param {String} trainingType - Type of training (reading, listening, speaking)
   * @returns {Array} - Array of completed item IDs
   */
  export const getLocallyStoredCompletedItems = (skillType, trainingType) => {
    if (!skillType || !trainingType) return [];
    
    const key = `${skillType}_${trainingType}_completed`;
    const stored = localStorage.getItem(key);
    
    try {
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error parsing stored completed items:', error);
      return [];
    }
  };