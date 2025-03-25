import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ContentDisplay from './ContentDisplay';
import ProgressBar from '../../CoursePlatform/common/ProgressBar';
import progressService from '../../services/progressService';
import { determineSkillType } from '../utils/skillTypeUtils';
import partsOfSpeechContent from '../content/partsOfSpeech.json';
import tensesContent from '../content/tenses.json';
import sentenceCorrectionContent from '../content/sentenceCorrection.json';
import communicationContent from '../content/communication.json';
import './LearningPage.css';

const LearningPage = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const skillType = determineSkillType(location.pathname);
  const isTrainingSection = ['reading', 'listening', 'speaking', 'mcq'].includes(topic);
  
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  const topics = [
    { id: 'parts-of-speech', title: 'Parts of Speech' },
    { id: 'tenses', title: 'Tenses' },
    { id: 'sentence-correction', title: 'Sentence Correction' },
    { id: 'communication', title: 'Communication' }
  ];
  
  const contentData = useMemo(() => {
    if (isTrainingSection) {
      return null;
    }
    try {
      switch (topic) {
        case 'parts-of-speech':
          return partsOfSpeechContent;
        case 'tenses':
          return tensesContent;
        case 'sentence-correction':
          return sentenceCorrectionContent;
        case 'communication':
          return communicationContent;
        default:
          throw new Error(`Topic not found: ${topic}`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load content. Please try again later.');
      return null;
    }
  }, [topic, isTrainingSection]);

  useEffect(() => {
    setContent(contentData);
  }, [contentData]);

  useEffect(() => {
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

    loadProgress();
  }, [topic, skillType]);

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
    try {
      const currentIndex = topics.findIndex(t => t.id === topic);
      const completedTopics = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
      if (!completedTopics.includes(topic)) {
        completedTopics.push(topic);
        localStorage.setItem(`${skillType}_completed`, JSON.stringify(completedTopics));
      }
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
    } catch (err) {
      console.error('Error during navigation:', err);
    }
  };

  return (
    <div className="learning-page">
      {error && <div className="error">{error}</div>}
      {content ? (
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
      ) : (
        <div>No content available.</div>
      )}
    </div>
  );
};

export default LearningPage;
