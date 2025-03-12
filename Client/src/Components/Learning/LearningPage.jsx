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
      
      const completedTopicsFromStorage = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
      const isCompletedInStorage = completedTopicsFromStorage.includes(topic);
      
      console.log(`Topic ${topic} completed in localStorage: ${isCompletedInStorage}`);
      
      const { learningProgress } = await progressService.getUserProgress(userId);
      console.log('Received learning progress:', learningProgress);
      
      const moduleProgress = learningProgress[skillType] || {};
      console.log(`Module progress for ${skillType}:`, moduleProgress);
      
      setProgress(moduleProgress);
      
      const isCompletedInDatabase = !!(moduleProgress[topic] && moduleProgress[topic].completed);
      console.log(`Topic ${topic} completed in database: ${isCompletedInDatabase}`);
      
      const topicIsCompleted = isCompletedInDatabase || isCompletedInStorage;
      setIsCompleted(topicIsCompleted);
      
      if (isCompletedInStorage && !isCompletedInDatabase) {
        console.log('Restoring completion status from localStorage to database');
        markAsCompleted(false);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setError('Failed to load progress. Please try again later.');
    }
  };
  
  const markAsCompleted = async (showNotification = true) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      if (isCompleted && showNotification) {
        console.log('Topic is already marked as completed, skipping update');
        return;
      }
      
      console.log(`Marking as completed - User: ${userId}, Skill: ${skillType}, Topic: ${topic}`);
      
      const updatedProgress = {
        completed: true,
        completedAt: new Date().toISOString(),
        visited: true,
        lastVisited: new Date().toISOString()
      };
      
      console.log('Progress data being sent:', updatedProgress);
      
      const result = await progressService.updateLearningProgress(userId, skillType, topic, updatedProgress);
      console.log('Update API response:', result);
      
      setProgress(prev => ({ ...prev, [topic]: updatedProgress }));
      setIsCompleted(true);
      
      const completedTopics = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
      if (!completedTopics.includes(topic)) {
        completedTopics.push(topic);
        localStorage.setItem(`${skillType}_completed`, JSON.stringify(completedTopics));
      }
      
      if (showNotification) {
        const progressEvent = new CustomEvent('progressUpdated', {
          detail: { userId, skillType, topic, completed: true }
        });
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
    setLoading(true);
    try {
      const currentIndex = topics.findIndex(t => t.id === topic);
      const completedTopics = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
      if (!completedTopics.includes(topic)) {
        completedTopics.push(topic);
        localStorage.setItem(`${skillType}_completed`, JSON.stringify(completedTopics));
      }
      setTimeout(() => {
        setLoading(false);
        if (currentIndex < topics.length - 1) {
          navigate(`/${skillType}/learning/${topics[currentIndex + 1].id}`);
        } else {
          if (skillType === 'softskills') {
            navigate('/softskills/training/reading');
          } else if (skillType === 'sales') {
            navigate('/sales/training/speaking');
          } else if (skillType === 'product') {
            navigate('/product/qa/mcq');
          }
        }
      }, 300);
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
