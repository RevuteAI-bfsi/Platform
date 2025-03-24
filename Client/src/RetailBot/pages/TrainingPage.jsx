import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getScenarioById, startConversation, sendMessage } from '../services/api';
import CustomerAvatar from '../components/CustomerAvatar';
import VoiceControl from '../components/VoiceControl';
import ConversationBox from '../components/ConversationBox';
import './Trainingpagebot.css';

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

  useEffect(() => {
    async function initializeTraining() {
      try {
        setLoading(true);
        setError(null);
        const scenarioData = await getScenarioById(scenarioId);
        setScenario(scenarioData);
        const conversationData = await startConversation(scenarioId, userId);
        setConversation(conversationData);
        setMessages([{ 
          id: Date.now(),
          role: 'customer',
          content: conversationData.initial_message 
        }]);
        speakText(conversationData.initial_message);
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
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, [scenarioId, userId, navigate]);

  const speakText = (text) => {
    if (!speechSynthesisRef.current) return;
    speechSynthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    const voices = speechSynthesisRef.current.getVoices();
    const indianVoice = voices.find(voice =>
      voice.lang === 'hi-IN' ||
      voice.lang === 'en-IN' ||
      voice.name.includes('Indian')
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechSynthesisRef.current.speak(utterance);
  };

  const handleSendMessage = async (message) => {
    if (!message.trim() || !conversation || processingMessage) return;
    try {
      setProcessingMessage(true);
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: message
      };
      setMessages(prev => [...prev, userMessage]);
      const response = await sendMessage(conversation.conversation_id, message);
      const customerMessage = {
        id: Date.now() + 1,
        role: 'customer',
        content: response.customer_message
      };
      setMessages(prev => [...prev, customerMessage]);
      speakText(response.customer_message);
      setProcessingMessage(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to communicate with the customer. Please try again.');
      setProcessingMessage(false);
    }
  };

  const handleEndTraining = () => {
    if (conversation) {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      navigate(`/report/${conversation.conversation_id}${userId && userId !== 'undefined' ? `?userId=${userId}` : ''}`);
    }
  };

  if (loading) {
    return (
      <div className="TrainingRetalBotPage-flex TrainingRetalBotPage-items-center TrainingRetalBotPage-justify-center TrainingRetalBotPage-min-h-screen TrainingRetalBotPage-bg-gray-50">
        <div className="TrainingRetalBotPage-text-xl TrainingRetalBotPage-text-blue-700">
          <span className="TrainingRetalBotPage-mr-2">
            <svg className="TrainingRetalBotPage-animate-spin TrainingRetalBotPage-h-5 TrainingRetalBotPage-w-5 TrainingRetalBotPage-inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="TrainingRetalBotPage-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="TrainingRetalBotPage-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          Initializing training session...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="TrainingRetalBotPage-flex TrainingRetalBotPage-flex-col TrainingRetalBotPage-items-center TrainingRetalBotPage-justify-center TrainingRetalBotPage-min-h-screen TrainingRetalBotPage-bg-gray-50">
        <div className="TrainingRetalBotPage-text-xl TrainingRetalBotPage-text-red-600 TrainingRetalBotPage-mb-4">{error}</div>
        <button 
          onClick={() => navigate('/')}
          className="TrainingRetalBotPage-px-4 TrainingRetalBotPage-py-2 TrainingRetalBotPage-bg-blue-700 TrainingRetalBotPage-text-white TrainingRetalBotPage-rounded-lg TrainingRetalBotPage-hover:bg-blue-800"
        >
          Return to Scenarios
        </button>
      </div>
    );
  }

  // useEffect(() => {
  //   window.scrollTo(0, 0);
  // }, []);
  

  return (
    <div className="TrainingRetalBotPage-training-container">
      <div className="TrainingRetalBotPage-conversation-header">
        <h2>{scenario?.title || 'Training Session'}</h2>
        <button 
          className="TrainingRetalBotPage-px-4 TrainingRetalBotPage-py-2 TrainingRetalBotPage-bg-red-600 TrainingRetalBotPage-text-white TrainingRetalBotPage-rounded-lg TrainingRetalBotPage-hover:bg-red-700 TrainingRetalBotPage-flex TrainingRetalBotPage-items-center"
          onClick={handleEndTraining}
        >
          <svg className="TrainingRetalBotPage-w-4 TrainingRetalBotPage-h-4 TrainingRetalBotPage-mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          End Conversation
        </button>
      </div>
      
      <div className="TrainingRetalBotPage-scenario-info">
        <div className="TrainingRetalBotPage-p-3 TrainingRetalBotPage-bg-blue-50 TrainingRetalBotPage-rounded-md TrainingRetalBotPage-mb-3">
          <p className="TrainingRetalBotPage-font-medium">Customer: {conversation?.customer_name}</p>
          <p className="TrainingRetalBotPage-text-sm TrainingRetalBotPage-text-gray-600">
            <span className="TrainingRetalBotPage-font-medium">Objective:</span> {scenario?.customer_objective}
          </p>
          <p className="TrainingRetalBotPage-text-sm TrainingRetalBotPage-text-gray-600">
            <span className="TrainingRetalBotPage-font-medium">Interests:</span> {scenario?.specific_interests}
          </p>
        </div>
      </div>
      
      <div className="TrainingRetalBotPage-avatar-container">
        <CustomerAvatar 
          name={conversation?.customer_name}
          type={conversation?.customer_avatar || 'default'}
          speaking={speaking}
        />
      </div>
      
      <ConversationBox messages={messages} />
      
      <VoiceControl 
        onMessage={handleSendMessage} 
        speaking={speaking}
        disabled={processingMessage}
      />
      
      <div className="TrainingRetalBotPage-end-conversation-container TrainingRetalBotPage-p-4 TrainingRetalBotPage-bg-gray-100 TrainingRetalBotPage-border-t TrainingRetalBotPage-border-gray-200 TrainingRetalBotPage-flex TrainingRetalBotPage-justify-center">
        <button 
          className="TrainingRetalBotPage-px-6 TrainingRetalBotPage-py-3 TrainingRetalBotPage-bg-red-600 TrainingRetalBotPage-text-white TrainingRetalBotPage-text-lg TrainingRetalBotPage-font-bold TrainingRetalBotPage-rounded-lg TrainingRetalBotPage-hover:bg-red-700 TrainingRetalBotPage-shadow-md TrainingRetalBotPage-flex TrainingRetalBotPage-items-center"
          onClick={handleEndTraining}
        >
          <svg className="TrainingRetalBotPage-w-5 TrainingRetalBotPage-h-5 TrainingRetalBotPage-mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
          END & VIEW REPORT
        </button>
      </div>
    </div>
  );
}

export default TrainingPage;
