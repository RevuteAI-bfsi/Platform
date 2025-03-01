// src/components/Layout/Sidebar.js
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, skillType = 'softskills' }) => {
  const location = useLocation();
  const [progress, setProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState({});
  const [isLearningCompleted, setIsLearningCompleted] = useState(false);
  
  useEffect(() => {
    // Load learning progress based on skillType
    try {
      const savedProgress = JSON.parse(localStorage.getItem(`${skillType}Progress`) || '{}');
      setProgress(savedProgress);
      
      // Check if all learning is completed
      let learningTopics;
      
      switch (skillType) {
        case 'softskills':
          learningTopics = ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
          break;
        case 'sales':
          learningTopics = ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
          break;
        case 'product':
          learningTopics = ['bank-terminologies', 'casa-kyc', 'personal-loans'];
          break;
        default:
          learningTopics = [];
      }
      
      const allCompleted = learningTopics.every(topic => 
        savedProgress[topic] && savedProgress[topic].completed
      );
      
      setIsLearningCompleted(allCompleted);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
    
    // Load training progress
    try {
      const savedTrainingProgress = JSON.parse(localStorage.getItem(`${skillType}TrainingResults`) || '{}');
      setTrainingProgress(savedTrainingProgress);
    } catch (error) {
      console.error('Error loading training progress:', error);
    }
  }, [location, skillType]); // Reload when location or skillType changes

  const getCompletionStatus = (topic) => {
    if (progress[topic] && progress[topic].completed) {
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    }
    return null;
  };
  
  const getTrainingCompletionStatus = (type) => {
    if (!trainingProgress[type]) return null;
    
    const completedCount = trainingProgress[type].length;
    let totalItems = 5; // Default
    
    // Adjust based on training type and skill type
    if (skillType === 'sales' && type === 'speaking') {
      totalItems = 10; // 10 questions for sales speaking training
    } else if (skillType === 'product' && type === 'mcq') {
      totalItems = 10; // 10 MCQs for product training
    }
    
    const percentage = Math.min(Math.round((completedCount / totalItems) * 100), 100);
    
    if (percentage >= 50) {
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    }
    
    return <span className="app-sidebar__completion-percentage">{percentage}%</span>;
  };

  // Render different sidebar content based on skill type
  const renderSidebarContent = () => {
    switch (skillType) {
      case 'softskills':
        return renderSoftSkillsSidebar();
      case 'sales':
        return renderSalesSidebar();
      case 'product':
        return renderProductSidebar();
      default:
        return renderSoftSkillsSidebar();
    }
  };

  // Soft Skills sidebar
  const renderSoftSkillsSidebar = () => {
    return (
      <>
        <div className="app-sidebar__header">
          <h2>Soft Skills</h2>
        </div>
        
        <nav className="app-sidebar__nav">
          <div className="app-sidebar__nav-section">
            <h3 className="app-sidebar__section-title">Learning</h3>
            <ul className="app-sidebar__nav-links">
              <li>
                <NavLink 
                  to="/softskills/learning/parts-of-speech" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Parts of Speech
                  {getCompletionStatus('parts-of-speech')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/softskills/learning/tenses" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Tenses
                  {getCompletionStatus('tenses')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/softskills/learning/sentence-correction" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Sentence Correction
                  {getCompletionStatus('sentence-correction')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/softskills/learning/communication" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Communication
                  {getCompletionStatus('communication')}
                </NavLink>
              </li>
            </ul>
          </div>
          
          <div className="app-sidebar__nav-section">
            <h3 className="app-sidebar__section-title">Training</h3>
            {!isLearningCompleted && (
              <div className="app-sidebar__locked-message">
                <span className="app-sidebar__lock-icon">🔒</span>
                <span>Complete all learning modules first</span>
              </div>
            )}
            <ul className={`app-sidebar__nav-links ${!isLearningCompleted ? 'app-sidebar__locked' : ''}`}>
              <li>
                <NavLink 
                  to="/softskills/training/reading" 
                  className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                  onClick={(e) => !isLearningCompleted && e.preventDefault()}
                >
                  Reading Practice
                  {getTrainingCompletionStatus('reading')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/softskills/training/listening" 
                  className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                  onClick={(e) => !isLearningCompleted && e.preventDefault()}
                >
                  Listening & Writing
                  {getTrainingCompletionStatus('listening')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/softskills/training/speaking" 
                  className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                  onClick={(e) => !isLearningCompleted && e.preventDefault()}
                >
                  Speaking Practice
                  {getTrainingCompletionStatus('speaking')}
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </>
    );
  };

  // Sales sidebar
  const renderSalesSidebar = () => {
    return (
      <>
        <div className="app-sidebar__header">
          <h2>Sales Personal Skills</h2>
        </div>
        
        <nav className="app-sidebar__nav">
          <div className="app-sidebar__nav-section">
            <h3 className="app-sidebar__section-title">Learning</h3>
            <ul className="app-sidebar__nav-links">
              <li>
                <NavLink 
                  to="/sales/learning/introduction" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Introduction to Sales
                  {getCompletionStatus('introduction')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/sales/learning/telecalling" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Tele-calling
                  {getCompletionStatus('telecalling')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/sales/learning/skills-needed" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Skills Needed for Tele-caller
                  {getCompletionStatus('skills-needed')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/sales/learning/telecalling-module" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Tele-calling Module
                  {getCompletionStatus('telecalling-module')}
                </NavLink>
              </li>
            </ul>
          </div>
          
          <div className="app-sidebar__nav-section">
            <h3 className="app-sidebar__section-title">Training</h3>
            {!isLearningCompleted && (
              <div className="app-sidebar__locked-message">
                <span className="app-sidebar__lock-icon">🔒</span>
                <span>Complete all learning modules first</span>
              </div>
            )}
            <ul className={`app-sidebar__nav-links ${!isLearningCompleted ? 'app-sidebar__locked' : ''}`}>
              <li>
                <NavLink 
                  to="/sales/training/speaking" 
                  className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                  onClick={(e) => !isLearningCompleted && e.preventDefault()}
                >
                  Speech to Speech
                  {getTrainingCompletionStatus('speaking')}
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </>
    );
  };

  // Product sidebar
  const renderProductSidebar = () => {
    return (
      <>
        <div className="app-sidebar__header">
          <h2>Product Skills</h2>
        </div>
        
        <nav className="app-sidebar__nav">
          <div className="app-sidebar__nav-section">
            <h3 className="app-sidebar__section-title">Learning</h3>
            <ul className="app-sidebar__nav-links">
              <li>
                <NavLink 
                  to="/product/learning/bank-terminologies" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Bank Terminologies
                  {getCompletionStatus('bank-terminologies')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/product/learning/casa-kyc" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  CASA + KYC
                  {getCompletionStatus('casa-kyc')}
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/product/learning/personal-loans" 
                  className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}
                >
                  Personal Loans
                  {getCompletionStatus('personal-loans')}
                </NavLink>
              </li>
            </ul>
          </div>
          
          <div className="app-sidebar__nav-section">
            <h3 className="app-sidebar__section-title">Q/A</h3>
            {!isLearningCompleted && (
              <div className="app-sidebar__locked-message">
                <span className="app-sidebar__lock-icon">🔒</span>
                <span>Complete all learning modules first</span>
              </div>
            )}
            <ul className={`app-sidebar__nav-links ${!isLearningCompleted ? 'app-sidebar__locked' : ''}`}>
              <li>
                <NavLink 
                  to="/product/qa/mcq" 
                  className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                  onClick={(e) => !isLearningCompleted && e.preventDefault()}
                >
                  MCQ Questions
                  {getTrainingCompletionStatus('mcq')}
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </>
    );
  };

  return (
    <div className={`app-sidebar ${isOpen ? 'app-sidebar__open' : 'app-sidebar__closed'}`}>
      {renderSidebarContent()}
    </div>
  );
};

export default Sidebar;