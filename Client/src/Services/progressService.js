import axios from 'axios';

const API_URL = '/api/profile'; // Base URL for profile endpoints

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
  
  // Save a training attempt in MongoDB
  saveTrainingAttempt: async (userId, trainingType, attempt) => {
    console.log(`Saving training attempt:`, { userId, trainingType, attempt });
    try {
      const response = await axios.post(`${API_URL}/training-attempt/${userId}`, {
        trainingType,
        attempt
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
  }
};

export default progressService;