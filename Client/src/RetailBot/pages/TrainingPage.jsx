import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getScenarioById, startConversation, sendMessage } from '../services/api';
import CustomerAvatar from '../components/CustomerAvatar';
import VoiceControl from '../components/VoiceControl';
import ConversationBox from '../components/ConversationBox';
import { cleanMessageContent } from '../utils/MessageCleaner';
import './Trainingpagebot.css';

/**
 * TrainingPage Component
 * 
 * Manages the training conversation between user and AI customer.
 * Handles message cleaning to prevent data leakage in customer responses.
 */
function TrainingPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('userId') || localStorage.getItem('userId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(false);
  
  const speechSynthesisRef = useRef(window.speechSynthesis);
  
  // Initialize conversation when page loads
  useEffect(() => {
    // Load voices early to ensure they're available when needed
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.getVoices();
    }
    
    async function initializeTraining() {
      try {
        setLoading(true);
        setError(null);
        
        // Get scenario details
        const scenarioData = await getScenarioById(scenarioId);
        setScenario(scenarioData);
        
        // Start conversation
        const conversationData = await startConversation(scenarioId, userId);
        setConversation(conversationData);
        
        // Clean and add initial message to prevent data leakage
        const cleanedInitialMessage = cleanMessageContent(conversationData.initial_message);
        setMessages([{ 
          id: Date.now(),
          role: 'customer', 
          content: cleanedInitialMessage
        }]);
        
        // Speak the cleaned initial message
        speakText(cleanedInitialMessage);
        
        setLoading(false);
      } catch (err) {
        console.error('Error initializing training:', err);
        setError('Failed to initialize training session. Please try again.');
        setLoading(false);
      }
    }
    
    if (userId) {
      initializeTraining();
    } else {
      navigate('/login');
    }

    // Cleanup speech synthesis on unmount
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, [scenarioId, userId, navigate]);
  
  // Function to speak text using speech synthesis
  const speakText = (text) => {
    if (!speechSynthesisRef.current || !text) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set properties for Indian English voice with slower rate
    utterance.lang = 'en-IN';
    utterance.rate = 0.8; // Slower rate (0.1 to 10, with 1 being normal)
    utterance.pitch = 1.0;
    
    // Try to find an Indian English voice if available
    const voices = speechSynthesisRef.current.getVoices();
    const indianVoice = voices.find(voice => 
      voice.lang === 'hi-IN' || 
      voice.lang === 'en-IN' ||
      voice.name.includes('Indian')
    );
    
    if (indianVoice) {
      utterance.voice = indianVoice;
    }
    
    // Set events
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setSpeaking(false);
    };
    
    // Speak the text
    speechSynthesisRef.current.speak(utterance);
  };
  
  // Handle sending a message
  const handleSendMessage = async (message) => {
    if (!message.trim() || !conversation || processingMessage) return;
    
    try {
      setProcessingMessage(true);
      
      // Add user message to UI immediately
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: message // User messages don't need cleaning
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send to API and get response
      const response = await sendMessage(conversation.conversation_id, message);
      
      if (!response || !response.customer_message) {
        throw new Error('Invalid response from server');
      }
      
      // Clean the customer response before adding to UI to prevent data leakage
      const cleanedCustomerMessage = cleanMessageContent(response.customer_message);
      
      // Add customer response to UI
      const customerMessage = {
        id: Date.now() + 1,
        role: 'customer',
        content: cleanedCustomerMessage
      };
      
      setMessages(prev => [...prev, customerMessage]);
      
      // Convert to speech using the cleaned message
      speakText(cleanedCustomerMessage);
      
      setProcessingMessage(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to communicate with the customer. Please try again.');
      setProcessingMessage(false);
    }
  };
  
  // Handle ending the training session
  const handleEndTraining = () => {
    if (conversation) {
      // Cancel any ongoing speech
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      
      // Navigate to report page
      navigate(`/report/${conversation.conversation_id}${userId && userId !== 'undefined' ? `?userId=${userId}` : ''}`);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="retailbot-loading-container">
        <div className="retailbot-loading-text">
          <span className="retailbot-loading-spinner">
            <svg className="retailbot-spinner-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="retailbot-spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="retailbot-spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          Initializing training session...
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="retailbot-error-container">
        <div className="retailbot-error-text">{error}</div>
        <button 
          onClick={() => navigate('/')}
          className="retailbot-back-button"
        >
          Return to Scenarios
        </button>
      </div>
    );
  }
  
  // Main UI
  return (
    <div className="retailbot-training-container">
      {/* Header with title and end button */}
      <div className="retailbot-conversation-header">
        <h2>{scenario?.title || 'Training Session'}</h2>
        <button 
          className="retailbot-end-conversation-btn"
          onClick={handleEndTraining}
        >
          <svg className="retailbot-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          End Conversation
        </button>
      </div>
      
      {/* Scenario information */}
      <div className="retailbot-scenario-info">
        <div className="retailbot-info-box">
          <p className="retailbot-info-label">Customer: {conversation?.customer_name}</p>
          <p className="retailbot-info-text">
            <span className="retailbot-info-label">Objective:</span> {scenario?.customer_objective}
          </p>
          <p className="retailbot-info-text">
            <span className="retailbot-info-label">Interests:</span> {scenario?.specific_interests}
          </p>
        </div>
      </div>
      
      {/* Customer avatar with speaking indicator */}
      <div className="retailbot-avatar-container">
        <CustomerAvatar 
          name={conversation?.customer_name}
          type={conversation?.customer_avatar || 'default'}
          speaking={speaking}
        />
      </div>
      
      {/* Main chat area */}
      <div className="retailbot-chat-main-container">
        <ConversationBox messages={messages} />
      </div>
      
      {/* Voice Controls with Text Input */}
      <div className="retailbot-controls-container">
        <VoiceControl 
          onMessage={handleSendMessage} 
          speaking={speaking}
          disabled={processingMessage}
        />
      </div>
      
      {/* Large, Prominent End Button */}
      <div className="retailbot-end-container">
        <button 
          className="retailbot-end-button"
          onClick={handleEndTraining}
          disabled={processingMessage}
        >
          <svg className="retailbot-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
          END & VIEW REPORT
        </button>
      </div>
    </div>
  );
}

export default TrainingPage;