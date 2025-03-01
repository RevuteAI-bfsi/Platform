import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContentDisplay from './ContentDisplay';
import ProgressBar from '../common/ProgressBar';
import './LearningPage.css';

// Import content files
import partsOfSpeechContent from '../../content/partsOfSpeech.json';
import tensesContent from '../../content/tenses.json';
import sentenceCorrectionContent from '../../content/sentenceCorrection.json';
import communicationContent from '../../content/communication.json';

const LearningPage = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // This would come from context or props in the full app
  const userId = localStorage.getItem('userId') || 'guest-user';
  
  // Get all available topics for navigation
  const topics = [
    { id: 'parts-of-speech', title: 'Parts of Speech' },
    { id: 'tenses', title: 'Tenses' },
    { id: 'sentence-correction', title: 'Sentence Correction' },
    { id: 'communication', title: 'Communication' }
  ];

  useEffect(() => {
    setLoading(true);
    
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
      
      // Load progress from localStorage
      loadProgress();
    } catch (err) {
      console.error(err);
      setError('Failed to load content. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [topic]);
  
  // Load progress data
  const loadProgress = () => {
    try {
      // In a real app, this would be an API call
      const savedProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
      setProgress(savedProgress);
      
      // Check if current topic is completed
      if (savedProgress[topic] && savedProgress[topic].completed) {
        setIsCompleted(true);
      } else {
        setIsCompleted(false);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };
  
  // Mark topic as completed
  const markAsCompleted = () => {
    try {
      // In a real app, this would be an API call
      const updatedProgress = { ...progress };
      
      if (!updatedProgress[topic]) {
        updatedProgress[topic] = {
          visited: true,
          lastVisited: new Date().toISOString()
        };
      }
      
      updatedProgress[topic].completed = true;
      updatedProgress[topic].completedAt = new Date().toISOString();
      
      localStorage.setItem('learningProgress', JSON.stringify(updatedProgress));
      setProgress(updatedProgress);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };
  
  // Calculate overall learning progress
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
  
  // Navigate to next topic
  const goToNextTopic = () => {
    const currentIndex = topics.findIndex(t => t.id === topic);
    if (currentIndex < topics.length - 1) {
      navigate(`/learning/${topics[currentIndex + 1].id}`);
    } else {
      // All topics completed, go to training
      navigate('/training/reading');
    }
  };
  
  // Check if all learning is completed
  const isAllLearningCompleted = () => {
    return topics.every(topicItem => 
      progress[topicItem.id] && progress[topicItem.id].completed
    );
  };

  if (loading) {
    return <div className="learning-page loading">Loading content...</div>;
  }

  if (error) {
    return <div className="learning-page error">{error}</div>;
  }

  return (
    <div className="learning-page">
      <div className="learning-progress">
        <h3>Learning Progress</h3>
        <ProgressBar percentage={calculateOverallProgress()} />
        <div className="topic-navigation">
          {topics.map(topicItem => (
            <button 
              key={topicItem.id}
              className={`topic-button ${topic === topicItem.id ? 'active' : ''} ${
                progress[topicItem.id]?.completed ? 'completed' : ''
              }`}
              onClick={() => navigate(`/learning/${topicItem.id}`)}
            >
              {topicItem.title}
              {progress[topicItem.id]?.completed && <span className="checkmark">✓</span>}
            </button>
          ))}
        </div>
      </div>
      
      <ContentDisplay content={content} />
      
      <div className="learning-actions">
        {!isCompleted ? (
          <button 
            className="mark-complete-button"
            onClick={markAsCompleted}
          >
            Mark as Completed
          </button>
        ) : (
          <div className="completed-message">
            <span className="big-checkmark">✓</span>
            <p>You've completed this topic!</p>
          </div>
        )}
        
        <div className="navigation-buttons">
          <button 
            className="next-topic-button"
            onClick={goToNextTopic}
          >
            {topics.findIndex(t => t.id === topic) < topics.length - 1 
              ? "Next Topic" 
              : "Go to Training"}
          </button>
          
          {isAllLearningCompleted() && (
            <button 
              className="go-training-button"
              onClick={() => navigate('/training/reading')}
            >
              Start Training Modules
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningPage;