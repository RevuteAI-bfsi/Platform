import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ContentDisplay from './ContentDisplay';
import ProgressBar from '../common/ProgressBar';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import './LearningPage.css';
import partsOfSpeechContent from '../../content/partsOfSpeech.json';
import tensesContent from '../../content/tenses.json';
import sentenceCorrectionContent from '../../content/sentenceCorrection.json';
import communicationContent from '../../content/communication.json';

const LearningPage = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Use dynamic skill type detection instead of hardcoding
  const skillType = determineSkillType(location.pathname);
  
  console.log(`LearningPage initialized with skillType: ${skillType}, topic: ${topic}`);
  const isTrainingSection = ['reading', 'listening', 'speaking', 'mcq'].includes(topic);
  const topics = [
    { id: 'parts-of-speech', title: 'Parts of Speech' },
    { id: 'tenses', title: 'Tenses' },
    { id: 'sentence-correction', title: 'Sentence Correction' },
    { id: 'communication', title: 'Communication' }
  ];

  useEffect(() => {
    setLoading(true);
    
    // Skip content loading if we're in a training section
    if (['reading', 'listening', 'speaking', 'mcq'].includes(topic)) {
      console.log(`Detected training topic "${topic}" - skipping content loading`);
      setLoading(false);
      return;
    }
    if (isTrainingSection) {
      console.log(`Detected training section "${topic}" - skipping content loading`);
      setLoading(false);
      return;
    }
    
    try {
      let selectedContent;
      switch (topic) {
        case 'parts-of-speech':
          selectedContent = partsOfSpeechContent;
          break;
        case 'tenses':
          selectedContent = tensesContent;
          break;
        case 'sentence-correction':
          selectedContent = sentenceCorrectionContent;
          break;
        case 'communication':
          selectedContent = communicationContent;
          break;
        default:
          throw new Error(`Topic not found: ${topic}`);
      }
      setContent(selectedContent);
      setError(null);
      loadProgress();
    } catch (err) {
      console.error(err);
      setError('Failed to load content. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [topic]);

  const loadProgress = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      console.log(`Loading progress for user ${userId}, skillType: ${skillType}`);
      
      // First, check local storage for a fallback during navigation
      const completedTopicsFromStorage = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
      const isCompletedInStorage = completedTopicsFromStorage.includes(topic);
      
      console.log(`Topic ${topic} completed in localStorage: ${isCompletedInStorage}`);
      
      // Get fresh data from server
      const { learningProgress } = await progressService.getUserProgress(userId);
      console.log('Received learning progress:', learningProgress);
      
      const moduleProgress = learningProgress[skillType] || {};
      console.log(`Module progress for ${skillType}:`, moduleProgress);
      
      setProgress(moduleProgress);
      
      // Check if the topic is completed
      const isCompletedInDatabase = !!(moduleProgress[topic] && moduleProgress[topic].completed);
      console.log(`Topic ${topic} completed in database: ${isCompletedInDatabase}`);
      
      // Use either database or localStorage data, preferring database
      const topicIsCompleted = isCompletedInDatabase || isCompletedInStorage;
      setIsCompleted(topicIsCompleted);
      
      // If we have localStorage data but not database data, and this topic is completed in localStorage,
      // we should update the database to ensure consistency
      if (isCompletedInStorage && !isCompletedInDatabase) {
        console.log('Restoring completion status from localStorage to database');
        markAsCompleted(false); // false indicates quiet mode - don't show notifications
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setError('Failed to load progress. Please try again later.');
    }
  };
  
// Fix the markAsCompleted function in LearningPage.jsx

const markAsCompleted = async (showNotification = true) => {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User not logged in');
      return;
    }
    
    // Don't proceed if already marked as completed
    if (isCompleted && showNotification) {
      console.log('Topic is already marked as completed, skipping update');
      return;
    }
    
    // Enhanced logging for debugging
    console.log(`Marking as completed - User: ${userId}, Skill: ${skillType}, Topic: ${topic}`);
    
    const updatedProgress = {
      completed: true,
      completedAt: new Date().toISOString(),
      visited: true,
      lastVisited: new Date().toISOString()
    };
    
    console.log('Progress data being sent:', updatedProgress);
    
    // Make API call to update the database
    const result = await progressService.updateLearningProgress(userId, skillType, topic, updatedProgress);
    console.log('Update API response:', result);
    
    // Immediately update local state
    setProgress(prev => ({ ...prev, [topic]: updatedProgress }));
    setIsCompleted(true);
    
    // Also update localStorage as a backup
    const completedTopics = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
    if (!completedTopics.includes(topic)) {
      completedTopics.push(topic);
      localStorage.setItem(`${skillType}_completed`, JSON.stringify(completedTopics));
    }
    
    // Only show notification and dispatch event if not in quiet mode
    if (showNotification) {
      // Create a detailed event
      const progressEvent = new CustomEvent('progressUpdated', {
        detail: { userId, skillType, topic, completed: true }
      });
      
      // Dispatch event to notify other components
      window.dispatchEvent(progressEvent);
      console.log('Dispatched progressUpdated event');
    }
  } catch (error) {
    console.error('Error updating progress:', error);
    if (showNotification) {
      setError('Failed to update progress. Please try again.');
    }
  }
};

  const calculateOverallProgress = () => {
    const totalTopics = topics.length;
    let completedTopics = 0;
    topics.forEach(topicItem => {
      if (progress[topicItem.id] && progress[topicItem.id].completed) {
        completedTopics++;
      }
    });
    return (completedTopics / totalTopics) * 100;
  };

 

const goToNextTopic = async () => {
  // Wait a moment to ensure progress is fully saved to the database
  // before navigating to the next page
  setLoading(true);
  
  try {
    // Get current index and determine next topic
    const currentIndex = topics.findIndex(t => t.id === topic);
    
    // Store the fact that the current topic is completed in localStorage
    // as a fallback during navigation
    const completedTopics = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
    if (!completedTopics.includes(topic)) {
      completedTopics.push(topic);
      localStorage.setItem(`${skillType}_completed`, JSON.stringify(completedTopics));
    }
    
    // Allow a short delay for the database to complete updates
    setTimeout(() => {
      setLoading(false);
      if (currentIndex < topics.length - 1) {
        // Navigate to next topic
        navigate(`/${skillType}/learning/${topics[currentIndex + 1].id}`);
      } else {
        // Navigate to training section
        if (skillType === 'softskills') {
          navigate('/softskills/training/reading');
        } else if (skillType === 'sales') {
          navigate('/sales/training/speaking');
        } else if (skillType === 'product') {
          navigate('/product/qa/mcq');
        }
      }
    }, 300); // Allow 300ms for database operations to complete
  } catch (err) {
    console.error('Error during navigation:', err);
    setLoading(false);
  }
};

  return (
    <div className="learning-page">
      {loading && <div className="loading">Loading content...</div>}
      {error && <div className="error">{error}</div>}
      
      {content && (
        <>
          <ContentDisplay content={content} />
          <ProgressBar percentage={calculateOverallProgress()} />
          {!isCompleted && (
            <button className="complete-btn" onClick={markAsCompleted}>
              Mark as Complete
            </button>
          )}
          {isCompleted && <div className="completed-msg">Topic Completed ✓</div>}
          <button className="next-btn" onClick={goToNextTopic}>
            Next Topic
          </button>
        </>
      )}
    </div>
  );
};

export default LearningPage;