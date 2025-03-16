import axios from 'axios';

const API_URL = '/api/profile';

const progressService = {
  // Get all progress for a user from MongoDB
  getUserProgress: async (userId) => {
    console.log(`Getting user progress for user: ${userId}`);
    try {
      const response = await axios.get(`${API_URL}/progress/${userId}`);
      console.log('Progress data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },
  
  // Update learning progress for a specific module and topic in MongoDB
  updateLearningProgress: async (userId, module, topic, progress) => {
    console.log(`Updating learning progress:`, { userId, module, topic, progress });
    
    if (!module || !topic || !progress) {
      console.error('Missing required fields:', { module, topic, progress });
      throw new Error('Missing required fields for progress update');
    }
    
    try {
      const response = await axios.put(`${API_URL}/learning-progress/${userId}`, {
        module,
        topic,
        progress
      });
      console.log('Progress update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating learning progress:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  // Save a sales speaking attempt with the new structure
  saveSalesSpeakingAttempt: async (userId, data) => {
    console.log(`Saving sales speaking attempt with new structure:`, data);
    
    const { questionId, question, attemptData, isFirstCompletion } = data;
    
    if (!questionId || !attemptData) {
      console.error('Missing required fields:', { questionId, attemptData });
      throw new Error('Missing required fields for attempt save');
    }
    
    try {
      const response = await axios.post(`${API_URL}/sales-speaking-attempt/${userId}`, {
        questionId,
        question,
        attemptData,
        isFirstCompletion,
        maxAttempts: 3 // Instruct backend to store only the first 3 attempts
      });
      
      console.log('Sales speaking attempt save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving sales speaking attempt:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  // Save a training attempt in MongoDB
  saveTrainingAttempt: async (userId, trainingType, attempt) => {
    console.log(`Saving training attempt:`, { userId, trainingType, attempt });
    try {
      const response = await axios.post(`${API_URL}/training-attempt/${userId}`, {
        trainingType,
        attempt,
        maxAttempts: 3 // Only the first 3 attempts will be stored
      });
      console.log('Training attempt save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving training attempt:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },
  
  // Update level completion status in MongoDB
  updateLevelCompletion: async (userId, completedLevels, levelScores) => {
    console.log(`Updating level completion:`, { userId, completedLevels, levelScores });
    try {
      const response = await axios.put(`${API_URL}/level-completion/${userId}`, {
        completedLevels,
        levelScores
      });
      console.log('Level completion update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating level completion:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },
  
  // Save a reading attempt with the new structure
  saveReadingAttempt: async (userId, data) => {
    console.log(`Saving reading attempt with new structure:`, data);
    
    const { passageId, title, attemptData, isFirstCompletion } = data;
    
    if (!passageId || !attemptData) {
      console.error('Missing required fields:', { passageId, attemptData });
      throw new Error('Missing required fields for attempt save');
    }
    
    try {
      const response = await axios.post(`${API_URL}/reading-attempt/${userId}`, {
        passageId,
        title,
        attemptData,
        isFirstCompletion,
        maxAttempts: 3 // Instruct backend to store only the first 3 attempts
      });
      
      console.log('Reading attempt save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving reading attempt:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },
  
  // Save a speaking attempt with the new structure
  saveSpeakingAttempt: async (userId, data) => {
    console.log(`Saving speaking attempt with new structure:`, data);
    
    const { topicId, title, attemptData, isFirstCompletion } = data;
    
    if (!topicId || !attemptData) {
      console.error('Missing required fields:', { topicId, attemptData });
      throw new Error('Missing required fields for attempt save');
    }
    
    try {
      const response = await axios.post(`${API_URL}/speaking-attempt/${userId}`, {
        topicId,
        title,
        attemptData,
        isFirstCompletion,
        maxAttempts: 3 // Only the first 3 attempts will be stored
      });
      
      console.log('Speaking attempt save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving speaking attempt:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },
  
  // Save a listening attempt with the new structure
  saveListeningAttempt: async (userId, data) => {
    console.log(`Saving listening attempt with new structure:`, data);
    
    const { exerciseId, title, attemptData, isFirstCompletion } = data;
    
    if (!exerciseId || !attemptData) {
      console.error('Missing required fields:', { exerciseId, attemptData });
      throw new Error('Missing required fields for attempt save');
    }
    
    try {
      const response = await axios.post(`${API_URL}/listening-attempt/${userId}`, {
        exerciseId,
        title,
        attemptData,
        isFirstCompletion,
        maxAttempts: 3 // Only the first 3 attempts will be stored
      });
      
      console.log('Listening attempt save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving listening attempt:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  }
};

export default progressService;
