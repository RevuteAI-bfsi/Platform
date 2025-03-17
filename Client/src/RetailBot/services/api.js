import axios from 'axios';

// Define a consistent base URL
const API_URL = 'http://localhost:5000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Scenario endpoints
export const getAllScenarios = async () => {
  const response = await api.get('/scenarios');
  return response.data;
};

export const getScenarioById = async (scenarioId) => {
  const response = await api.get(`/scenarios/${scenarioId}`);
  return response.data;
};

// Conversation endpoints
export const startConversation = async (scenarioId, userId) => {
  const response = await api.post('/conversation/start', {
    scenario_id: scenarioId,
    user_id: userId
  });
  return response.data;
};

export const sendMessage = async (conversationId, message, userId) => {
  const response = await api.post('/conversation/message', {
    conversation_id: conversationId,
    message: message,
    user_id: userId
  });
  return response.data;
};

export const getUserProgress = async (userId) => {
  try {
    const response = await api.get(`/user-progress/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user progress:", error);
    // Re-throw the error so it can be caught and handled by the component
    throw error;
  }
};

// Analysis endpoints
export const getPerformanceReport = async (conversationId, userId) => {
  const url = userId && userId !== 'undefined' 
    ? `/analysis/${conversationId}?userId=${userId}`
    : `/analysis/${conversationId}`;
    
  const response = await api.get(url);
  return response.data;
};

export default api;