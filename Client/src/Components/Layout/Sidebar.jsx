import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import './Sidebar.css';

const Sidebar = ({ isOpen, skillType: propSkillType }) => {
  const location = useLocation();
  const [progress, setProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState({});
  const [isLearningCompleted, setIsLearningCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const determineSkillTypeCallback = useCallback(() => {
    if (propSkillType) {
      console.log(`Using prop skillType: ${propSkillType}`);
      return propSkillType;
    }
    const detectedSkillType = determineSkillType(location.pathname);
    console.log(`Detected skillType from URL: ${detectedSkillType} (pathname: ${location.pathname})`);
    return detectedSkillType;
  }, [propSkillType, location.pathname]);

  const skillType = determineSkillTypeCallback();

  const getLearningTopics = useCallback(() => {
    if (skillType === 'sales') {
      return ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
    } else if (skillType === 'product') {
      return ['bank-terminologies', 'casa-kyc', 'personal-loans'];
    } else {
      return ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
    }
  }, [skillType]);

  const loadUserProgress = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('User not logged in');
        setError('User not logged in');
        return;
      }
      console.log(`Sidebar loading progress for user ${userId} with skillType ${skillType}`);
      const learningTopics = getLearningTopics();
      const completedTopicsFromStorage = JSON.parse(
        localStorage.getItem(`${skillType}_completed`) || '[]'
      );
      const allCompletedInStorage = learningTopics.every(topic => 
        completedTopicsFromStorage.includes(topic)
      );
      if (allCompletedInStorage) {
        console.log(`All ${skillType} topics completed according to localStorage`);
        setIsLearningCompleted(true);
        progressService.getUserProgress(userId).then(data => {
          setProgress(data.learningProgress[skillType] || {});
          setTrainingProgress(data.trainingProgress || {});
          setLastRefresh(Date.now());
        }).catch(err => {
          console.error('Background progress load error:', err);
        });
        return;
      }
      const { learningProgress, trainingProgress } = await progressService.getUserProgress(userId);
      console.log('Received progress data:', { learningProgress, trainingProgress });
      const moduleProgress = learningProgress[skillType] || {};
      console.log(`Module progress for ${skillType}:`, moduleProgress);
      setProgress(moduleProgress);
      console.log(`Completed topics from localStorage: ${completedTopicsFromStorage.join(', ')}`);
      const topicsStatus = learningTopics.map(topic => ({
        topic,
        existsInDb: !!moduleProgress[topic],
        completedInDb: moduleProgress[topic] && moduleProgress[topic].completed,
        completedInStorage: completedTopicsFromStorage.includes(topic)
      }));
      console.log(`Topics status:`, topicsStatus);
      const allCompleted = learningTopics.every(topic => 
        (moduleProgress[topic] && moduleProgress[topic].completed) || 
        completedTopicsFromStorage.includes(topic)
      );
      console.log(`All ${skillType} topics completed? ${allCompleted}`);
      if (!allCompletedInStorage) {
        const completedInDb = learningTopics.filter(topic => 
          moduleProgress[topic] && moduleProgress[topic].completed
        );
        if (completedInDb.length > 0) {
          const allCompletedTopics = [...new Set([...completedTopicsFromStorage, ...completedInDb])];
          localStorage.setItem(`${skillType}_completed`, JSON.stringify(allCompletedTopics));
          console.log(`Updated localStorage with completed topics:`, allCompletedTopics);
        }
      }
      setIsLearningCompleted(allCompleted);
      setTrainingProgress(trainingProgress || {});
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Error loading progress:', error);
      setError('Failed to load progress. Please try again.');
    }
  }, [skillType, getLearningTopics]);

  useEffect(() => {
    console.log(`Sidebar effect triggered. SkillType: ${skillType}`);
    loadUserProgress();
  }, [location.pathname, skillType, loadUserProgress]);

  useEffect(() => {
    const handleProgressUpdate = (event) => {
      console.log('Sidebar received progressUpdated event:', event.detail);
      if (event.detail && event.detail.progress && event.detail.skillType === skillType) {
        console.log('Applying progress data from event:', event.detail.progress);
        setProgress(event.detail.progress);
        const learningTopics = getLearningTopics();
        const allCompleted = learningTopics.every(topic => 
          event.detail.progress[topic] && event.detail.progress[topic].completed
        );
        console.log(`All ${skillType} topics completed (from event data)? ${allCompleted}`);
        setIsLearningCompleted(allCompleted);
      } else {
        console.log('Fetching fresh progress data from server');
        loadUserProgress();
      }
    };
    
    window.addEventListener('progressUpdated', handleProgressUpdate);
    return () => window.removeEventListener('progressUpdated', handleProgressUpdate);
  }, [loadUserProgress, skillType, getLearningTopics]);

  const getCompletionStatus = (topic) => {
    if (progress[topic] && progress[topic].completed) {
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    }
    const completedTopicsFromStorage = JSON.parse(
      localStorage.getItem(`${skillType}_completed`) || '[]'
    );
    if (completedTopicsFromStorage.includes(topic)) {
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    }
    return null;
  };

  const getTrainingCompletionStatus = (type) => {
    if (!trainingProgress[type]) return null;
    const completedCount = trainingProgress[type].length;
    let totalItems = 5;
    if (skillType === 'sales' && type === 'speaking') totalItems = 10;
    else if (skillType === 'product' && type === 'mcq') totalItems = 10;
    const percentage = Math.min(Math.round((completedCount / totalItems) * 100), 100);
    if (percentage >= 50) {
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    }
    return <span className="app-sidebar__completion-percentage">{percentage}%</span>;
  };

  const handleTrainingClick = (e) => {
    if (!isLearningCompleted) {
      e.preventDefault();
      console.log('Training section is locked. Complete all learning modules first.');
      const learningTopics = getLearningTopics();
      const completedTopicsFromStorage = JSON.parse(
        localStorage.getItem(`${skillType}_completed`) || '[]'
      );
      const missingTopics = learningTopics.filter(topic => 
        !completedTopicsFromStorage.includes(topic) && 
        !(progress[topic] && progress[topic].completed)
      );
      if (missingTopics.length > 0) {
        console.log(`Missing topics: ${missingTopics.join(', ')}`);
      }
      return false;
    }
    return true;
  };

  const renderSoftSkillsSidebar = () => (
    <>
      <div className="app-sidebar__header">
        <h2>Soft Skills</h2>
        <div className="sidebar-debug">
          <small>Last Visit: {new Date(lastRefresh).toLocaleTimeString()}</small><br />
          <small className="completion-status">
            Learning completed: {isLearningCompleted ? '✓' : '✗'}
          </small>
        </div>
      </div>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Learning</h3>
          <ul className="app-sidebar__nav-links">
            <li>
              <NavLink to="/softskills/learning/parts-of-speech" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Parts of Speech {getCompletionStatus('parts-of-speech')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/softskills/learning/tenses" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Tenses {getCompletionStatus('tenses')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/softskills/learning/sentence-correction" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Sentence Correction {getCompletionStatus('sentence-correction')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/softskills/learning/communication" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Communication {getCompletionStatus('communication')}
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
                onClick={handleTrainingClick}
              >
                Reading Practice {getTrainingCompletionStatus('reading')}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/training/listening"
                className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                onClick={handleTrainingClick}
              >
                Listening & Writing {getTrainingCompletionStatus('listening')}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/training/speaking"
                className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                onClick={handleTrainingClick}
              >
                Speaking Practice {getTrainingCompletionStatus('speaking')}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );

  const renderSalesSidebar = () => (
    <>
      <div className="app-sidebar__header">
        <h2>Sales Skills</h2>
        <div className="sidebar-debug">
          <small>Last refreshed: {new Date(lastRefresh).toLocaleTimeString()}</small>
          <small className="completion-status">
            Learning completed: {isLearningCompleted ? '✓' : '✗'}
          </small>
        </div>
      </div>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Learning</h3>
          <ul className="app-sidebar__nav-links">
            <li>
              <NavLink to="/sales/learning/introduction" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Introduction {getCompletionStatus('introduction')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/sales/learning/telecalling" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Tele-calling {getCompletionStatus('telecalling')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/sales/learning/skills-needed" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Skills Needed {getCompletionStatus('skills-needed')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/sales/learning/telecalling-module" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Tele-calling Module {getCompletionStatus('telecalling-module')}
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
                onClick={handleTrainingClick}
              >
                Speaking Practice {getTrainingCompletionStatus('speaking')}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );

  const renderProductSidebar = () => (
    <>
      <div className="app-sidebar__header">
        <h2>Product Skills</h2>
        <div className="sidebar-debug">
          <small>Last refreshed: {new Date(lastRefresh).toLocaleTimeString()}</small>
          <small className="completion-status">
            Learning completed: {isLearningCompleted ? '✓' : '✗'}
          </small>
        </div>
      </div>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Learning</h3>
          <ul className="app-sidebar__nav-links">
            <li>
              <NavLink to="/product/learning/bank-terminologies" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Bank Terminologies {getCompletionStatus('bank-terminologies')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/product/learning/casa-kyc" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                CASA + KYC {getCompletionStatus('casa-kyc')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/product/learning/personal-loans" className={({ isActive }) => isActive ? 'app-sidebar__active' : ''}>
                Personal Loans {getCompletionStatus('personal-loans')}
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
                to="/product/qa/mcq"
                className={({ isActive }) => `${isActive ? 'app-sidebar__active' : ''} ${!isLearningCompleted ? 'app-sidebar__disabled' : ''}`}
                onClick={handleTrainingClick}
              >
                MCQ Training {getTrainingCompletionStatus('mcq')}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );

  const renderSidebarContent = () => {
    console.log(`Rendering sidebar for skill type: ${skillType}`);
    if (skillType === 'softskills') return renderSoftSkillsSidebar();
    if (skillType === 'sales') return renderSalesSidebar();
    if (skillType === 'product') return renderProductSidebar();
    return renderSoftSkillsSidebar();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : 'app-sidebar__closed'}`}>
      {error && <div className="error-message">{error}</div>}
      {renderSidebarContent()}
    </aside>
  );
};

export default Sidebar;
