// src/components/Product/ProductLearningPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContentDisplay from '../Learning/ContentDisplay';
import ProgressBar from '../common/ProgressBar';
import '../Learning/LearningPage.css';

// Import content files
import bankTerminologies from '../../content/product/bankTerminologies.json';
import casaKyc from '../../content/product/casaKyc.json';
import personalLoans from '../../content/product/personalLoans.json';

const ProductLearningPage = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Get all available topics for navigation
  const topics = [
    { id: 'bank-terminologies', title: 'Bank Terminologies' },
    { id: 'casa-kyc', title: 'CASA + KYC' },
    { id: 'personal-loans', title: 'Personal Loans' }
  ];

  useEffect(() => {
    setLoading(true);
    
    try {
      let selectedContent;
      
      switch (topic) {
        case 'bank-terminologies':
          selectedContent = bankTerminologies;
          break;
        case 'casa-kyc':
          selectedContent = casaKyc;
          break;
        case 'personal-loans':
          selectedContent = personalLoans;
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
      const savedProgress = JSON.parse(localStorage.getItem('productProgress') || '{}');
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
      
      localStorage.setItem('productProgress', JSON.stringify(updatedProgress));
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
      navigate(`/product/learning/${topics[currentIndex + 1].id}`);
    } else {
      // All topics completed, go to MCQ
      navigate('/product/qa/mcq');
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
              onClick={() => navigate(`/product/learning/${topicItem.id}`)}
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
              : "Go to MCQ"}
          </button>
          
          {isAllLearningCompleted() && (
            <button 
              className="go-training-button"
              onClick={() => navigate('/product/qa/mcq')}
            >
              Start MCQ Questions
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductLearningPage;