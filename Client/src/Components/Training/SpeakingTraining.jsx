import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import speakingTopics from '../../training/speakingTopics.json';
import ProgressBar from '../common/ProgressBar';
import ScoreBreakdown from '../common/ScoreBreakdown';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import './TrainingStyles.css';

const SpeakingTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [previousModulesCompleted, setPreviousModulesCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [detailedScore, setDetailedScore] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);
  
  // Use consistent skill type detection
  const skillType = determineSkillType(location.pathname);
  const userId = localStorage.getItem('userId');
  
  // References for timers and speech recognition
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // Pre-process topics on component mount
  useEffect(() => {
    try {
      console.log('Initializing SpeakingTraining component...');
      
      // Safely check if speakingTopics is available and valid
      if (!speakingTopics || !Array.isArray(speakingTopics)) {
        console.error('Error: speakingTopics is not a valid array', speakingTopics);
        setError('Failed to load speaking topics data. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log(`Processing ${speakingTopics.length} speaking topics`);
      
      // Process topics and add any necessary properties
      const processedTopics = speakingTopics.map(topic => ({
        ...topic,
        // Default values for any missing properties
        level: topic.level || 'Beginner',
        timeLimit: topic.timeLimit || 120, // 2 minutes default
        tips: topic.tips || [],
        keyPoints: topic.keyPoints || []
      }));
      
      setTopics(processedTopics);
      setContentLoaded(true);
    } catch (err) {
      console.error('Error processing topics data:', err);
      setError('Failed to process topics data. Please try again.');
      setLoading(false);
    }
  }, []);

  // Get learning topics based on skill type
  const getLearningTopics = useCallback(() => {
    if (skillType === 'sales') {
      return ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
    } else if (skillType === 'product') {
      return ['bank-terminologies', 'casa-kyc', 'personal-loans'];
    } else {
      // Default to softskills
      return ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
    }
  }, [skillType]);

  // Check previous completion and dependencies
  useEffect(() => {
    const checkPreviousCompletion = async () => {
      try {
        setLoading(true);
        
        if (!userId) {
          setError('User not logged in');
          navigate('/login');
          return;
        }
        
        console.log(`Checking previous completion for user ${userId}, skillType ${skillType}`);
        
        // First, check localStorage for completion status (faster)
        const completedTopicsFromStorage = JSON.parse(
          localStorage.getItem(`${skillType}_completed`) || '[]'
        );
        
        // Get the appropriate learning topics for this skill type
        const learningTopics = getLearningTopics();
        
        // Check if all required topics are completed in localStorage
        const allCompletedInStorage = learningTopics.every(topic => 
          completedTopicsFromStorage.includes(topic)
        );
        
        console.log(`Learning completion status from localStorage: ${allCompletedInStorage}`);
        
        let allLearningCompleted = allCompletedInStorage;
        let areModulesCompleted = true;
        
        // If not found in localStorage, check the server
        if (!allCompletedInStorage) {
          const userProgress = await progressService.getUserProgress(userId);
          const learningProgress = userProgress.learningProgress[skillType] || {};
          
          // Check if all topics are completed in the database
          allLearningCompleted = learningTopics.every(topic => 
            learningProgress[topic] && learningProgress[topic].completed
          );
          
          console.log(`All ${skillType} learning topics completed? ${allLearningCompleted}`);
          
          // Store in localStorage for future checks
          if (allLearningCompleted) {
            localStorage.setItem(`${skillType}_completed`, JSON.stringify(learningTopics));
          }
        }
        
        // For softskills, check previous training modules completion
        if (skillType === 'softskills') {
          const userProgress = await progressService.getUserProgress(userId);
          const trainingProgress = userProgress.trainingProgress || {};
          
          // Check reading and listening modules
          const readingAttempts = trainingProgress.reading || [];
          const listeningAttempts = trainingProgress.listening || [];
          const readingCompletionPercentage = (readingAttempts.length / 5) * 100;
          const listeningCompletionPercentage = (listeningAttempts.length / 5) * 100;
          
          areModulesCompleted = readingCompletionPercentage >= 50 && listeningCompletionPercentage >= 50;
          
          console.log('Previous modules status:', {
            readingCompletion: readingCompletionPercentage,
            listeningCompletion: listeningCompletionPercentage,
            areModulesCompleted
          });
        }
        
        setLearningCompleted(allLearningCompleted);
        setPreviousModulesCompleted(areModulesCompleted);
        
        // Redirect if prerequisites are not met
        if (!allLearningCompleted) {
          console.log(`Not all learning topics completed, redirecting to learning page`);
          navigate(`/${skillType}/learning/${learningTopics[0]}`);
          return;
        } else if (skillType === 'softskills' && !areModulesCompleted) {
          console.log('Previous modules not completed, redirecting to appropriate module');
          navigate('/softskills/training/reading');
          return;
        }
        
        await loadCompletedTopics();
        await loadAttemptHistory();
        setLoading(false);
      } catch (err) {
        console.error('Error checking completion:', err);
        setError('Failed to load progress data. Please try again.');
        setLoading(false);
      }
    };

    // Initialize Web Speech API
    const initSpeechRecognition = () => {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscriptSegment = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscriptSegment += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscriptSegment) {
            finalTranscriptRef.current += ' ' + finalTranscriptSegment;
            setTranscript(finalTranscriptRef.current.trim());
          } else if (interimTranscript) {
            setTranscript(finalTranscriptRef.current + ' ' + interimTranscript);
          }
        };
        
        recognitionRef.current.onend = () => {
          if (isRecording) {
            // Try to restart if still recording
            setTimeout(() => {
              try {
                if (isRecording) {
                  recognitionRef.current.start();
                }
              } catch (error) {
                console.error('Error restarting recognition:', error);
              }
            }, 200);
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            stopRecording();
          }
        };
      } else {
        setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
      }
    };

    if (contentLoaded) {
      checkPreviousCompletion();
      initSpeechRecognition();
    }
    
    return () => {
      cleanupResources();
    };
  }, [contentLoaded, navigate, userId, skillType, getLearningTopics]);

  // Cleanup function to prevent memory leaks
  const cleanupResources = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Load completed topics from the server
  const loadCompletedTopics = async () => {
    try {
      if (!userId) return;
      
      console.log(`Loading completed topics for user ${userId}, skillType ${skillType}`);
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const speakingAttempts = trainingProgress.speaking || [];
      const completed = speakingAttempts.map(result => result.topicId);
      
      console.log(`Found ${completed.length} completed speaking topics`);
      
      setCompletedTopics(completed);
    } catch (error) {
      console.error('Error loading completed topics:', error);
      setError('Failed to load completed topics. Please try again.');
    }
  };

  // Load attempt history for displaying past attempts
  const loadAttemptHistory = async () => {
    try {
      if (!userId) return;
      
      console.log(`Loading speaking attempt history for user ${userId}`);
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const speakingAttempts = trainingProgress.speaking || [];
      
      setAttemptHistory(speakingAttempts);
    } catch (error) {
      console.error('Error loading attempt history:', error);
    }
  };

  const calculateCompletionPercentage = () => {
    if (!topics.length) return 0;
    return (completedTopics.length / topics.length) * 100;
  };

  const isTopicCompleted = (topicId) => completedTopics.includes(topicId);

  const selectTopic = (topic) => {
    setSelectedTopic(topic);
    setTranscript('');
    setIsPreparing(false);
    setIsRecording(false);
    setTimeLeft(0);
    setFeedback(null);
    setDetailedScore(null);
  };

  const startPreparation = () => {
    if (!selectedTopic) {
      setError('No topic selected. Please select a topic and try again.');
      return;
    }
    
    setIsPreparing(true);
    setTimeLeft(30); // 30 seconds preparation time
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          startRecording();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not available. Please try a different browser.');
      return;
    }

    if (isPreparing) {
      setIsPreparing(false);
      clearInterval(timerRef.current);
    }
    
    setTranscript('');
    finalTranscriptRef.current = '';
    setIsRecording(true);
    
    // Set the timer based on the topic's time limit (or default to 2 minutes)
    const timeLimit = selectedTopic ? (selectedTopic.timeLimit || 120) : 120;
    setTimeLeft(timeLimit);
    
    // Ensure recognition is not running already
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.log('Recognition was not running, starting fresh.');
    }
    
    // Start speech recognition after a small delay
    setTimeout(() => {
      try {
        recognitionRef.current.start();
        
        // Start the countdown timer
        timerRef.current = setInterval(() => {
          setTimeLeft(prevTime => {
            if (prevTime <= 1) {
              clearInterval(timerRef.current);
              stopRecording();
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      } catch (error) {
        console.error('Error starting recognition:', error);
        setError('Error starting speech recognition. Please try again.');
        setIsRecording(false);
      }
    }, 300);
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (selectedTopic && transcript) {
        analyzeResponse();
      }
    }
  };

  const analyzeResponse = () => {
    if (!selectedTopic || !transcript.trim()) {
      setError('No response recorded. Please try again.');
      return;
    }
    
    try {
      // Analysis logic for the speaking response
      const words = transcript.split(/\s+/).filter(w => w.trim().length > 0);
      const wordCount = words.length;
      
      // Calculate key points covered
      const keyPointsCovered = selectedTopic.keyPoints.filter(point => {
        const keywords = point.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        return keywords.some(keyword => transcript.toLowerCase().includes(keyword));
      }).length;
      
      const keyPointsPercentage = Math.round((keyPointsCovered / selectedTopic.keyPoints.length) * 100);
      
      // Generate feedback text
      let feedbackText = '';
      let score = 0;
      
      if (wordCount < 30) {
        feedbackText = "Your response was very brief. Try to develop your ideas more fully.";
        score = 30;
      } else if (wordCount < 60) {
        feedbackText = "Your response was somewhat short. Work on elaborating your points with examples.";
        score = 50;
      } else if (wordCount < 100) {
        feedbackText = "Good start! You provided a reasonable response, but could add more detail.";
        score = 70;
      } else {
        feedbackText = "Excellent! You provided a detailed response with good development.";
        score = 90;
      }
      
      if (keyPointsPercentage < 30) {
        feedbackText += " Your response missed many important points about the topic.";
      } else if (keyPointsPercentage < 60) {
        feedbackText += " You covered some key aspects of the topic, but missed others.";
      } else if (keyPointsPercentage < 80) {
        feedbackText += " You addressed most of the important aspects of the topic.";
      } else {
        feedbackText += " You covered the topic comprehensively, addressing the main points.";
      }
      
      // Adjust score based on key points covered
      score = Math.round((score + keyPointsPercentage) / 2);
      
      // Create detailed score object for ScoreBreakdown component
      const scoreData = {
        totalScore: Math.round(score / 10),
        percentageScore: score,
        metrics: {
          wordCount,
          keyPointsCovered,
          totalKeyPoints: selectedTopic.keyPoints.length,
          fluency: {
            score: Math.min(5, Math.round((wordCount / 150) * 5)),
            maxScore: 5
          },
          content: {
            score: Math.min(5, Math.round((keyPointsCovered / selectedTopic.keyPoints.length) * 5)),
            maxScore: 5
          }
        }
      };
      
      setDetailedScore(scoreData);
      
      // Feedback object for UI display
      setFeedback({
        score,
        text: feedbackText,
        wordCount,
        keyPointsCovered,
        totalKeyPoints: selectedTopic.keyPoints.length
      });
      
      // Save attempt if score is high enough
      if (score >= 60) {
        saveAttempt(selectedTopic, score, transcript, wordCount, keyPointsCovered);
      }
    } catch (error) {
      console.error('Error analyzing response:', error);
      setError('Error analyzing your response. Please try again.');
    }
  };

  const saveAttempt = async (topic, score, transcript, wordCount, keyPointsCovered) => {
    try {
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      const attempt = {
        topicId: topic.id,
        title: topic.title,
        score: score,
        transcript: transcript,
        metrics: {
          wordCount,
          keyPointsCovered,
          totalKeyPoints: topic.keyPoints.length
        },
        date: new Date().toISOString()
      };
      
      console.log(`Saving speaking attempt:`, attempt);
      
      await progressService.saveTrainingAttempt(userId, 'speaking', attempt);
      
      // Update local state
      if (!completedTopics.includes(topic.id)) {
        setCompletedTopics([...completedTopics, topic.id]);
      }
      
      setAttemptHistory([...attemptHistory, attempt]);
      
      // Dispatch event to refresh progress in other components
      const progressEvent = new CustomEvent('progressUpdated', {
        detail: { userId, skillType, type: 'speaking', topicId: topic.id }
      });
      window.dispatchEvent(progressEvent);
      
      console.log('Speaking attempt saved and progressUpdated event dispatched');
    } catch (error) {
      console.error('Error saving attempt:', error);
      setError('Failed to save your attempt. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleBackToList = () => {
    setSelectedTopic(null);
    setTranscript('');
    setIsPreparing(false);
    setIsRecording(false);
    setFeedback(null);
    setDetailedScore(null);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const tryAgain = () => {
    setTranscript('');
    setFeedback(null);
    setDetailedScore(null);
    setIsPreparing(false);
    setIsRecording(false);
    setTimeLeft(0);
  };

  const hasCompletedEnough = () => {
    return completedTopics.length >= Math.ceil(topics.length * 0.5);
  };

  return (
    <div className="training-container">
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading speaking exercises...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="clear-error-btn">Dismiss</button>
        </div>
      )}
      
      {!loading && (
        <>
          <div className="training-header">
            <h1>Speaking Practice</h1>
            <p className="training-description">
              Improve your speaking skills by responding to prompts.
              You'll have time to prepare, then record your response.
              Complete at least 50% of the topics to finish this module.
            </p>
            
            <div className="training-progress">
              <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />
              
              {hasCompletedEnough() ? (
                <div className="progress-message success">
                  <span className="checkmark">✓</span>
                  Congratulations! You have completed the Speaking module!
                </div>
              ) : (
                <div className="progress-message">
                  Complete {Math.ceil(topics.length * 0.5) - completedTopics.length} more topic(s) to complete this module.
                </div>
              )}
              
              {hasCompletedEnough() && (
                <div className="module-completion">
                  <h3>{skillType.charAt(0).toUpperCase() + skillType.slice(1)} Training Complete!</h3>
                  <p>You have successfully completed all required modules of the {skillType} training.</p>
                  <div className="completion-badge">
                    <span className="badge-checkmark">✓</span>
                    <span>Training Completed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {!selectedTopic ? (
            <div className="topic-list">
              <h2>Select a Speaking Topic</h2>
              <div className="cards-grid">
                {topics.map(topic => (
                  <div 
                    className={`training-card ${isTopicCompleted(topic.id) ? 'completed' : ''}`}
                    key={topic.id}
                    onClick={() => selectTopic(topic)}
                  >
                    <h3>
                      {topic.title}
                      {isTopicCompleted(topic.id) && <span className="card-checkmark">✓</span>}
                    </h3>
                    <div className="card-content">
                      <p>{topic.prompt}</p>
                    </div>
                    <div className="card-footer">
                      <span className="card-level">{topic.level}</span>
                      <span className="time-limit">{Math.floor(topic.timeLimit / 60)} min</span>
                      {isTopicCompleted(topic.id) && <span className="card-completed">Completed</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              {attemptHistory.length > 0 && (
                <div className="attempt-history-section">
                  <h3>Recent Attempts</h3>
                  <div className="attempt-list">
                    {attemptHistory.slice(-5).map((attempt, index) => (
                      <div key={index} className="attempt-item">
                        <div className="attempt-header">
                          <span className="attempt-title">{attempt.title}</span>
                          <span className="attempt-date">
                            {new Date(attempt.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="attempt-score">
                          Score: <span style={{ 
                            color: attempt.score >= 80 ? '#4caf50' : 
                                  attempt.score >= 60 ? '#ff9800' : '#f44336' 
                          }}>{attempt.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="speaking-practice">
              <div className="exercise-header">
                <h2>{selectedTopic.title}</h2>
                <button 
                  className="back-button" 
                  onClick={handleBackToList}
                  disabled={isRecording || isPreparing}
                >
                  ← Back to topics
                </button>
              </div>
              
              <div className="topic-prompt">
                <h3>Speaking Prompt:</h3>
                <p>{selectedTopic.prompt}</p>
              </div>
              
              {selectedTopic.tips && selectedTopic.tips.length > 0 && (
                <div className="tips-section">
                  <h3>Speaking Tips:</h3>
                  <ul className="tips-list">
                    {selectedTopic.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {(isPreparing || isRecording || timeLeft > 0) && (
                <div className="timer-container">
                  <div className="timer">
                    <span className="time-display">{formatTime(timeLeft)}</span>
                    <span className="time-label">
                      {isPreparing ? 'Preparation Time' : 'Speaking Time'}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="practice-controls">
                {!isPreparing && !isRecording && !feedback && (
                  <button 
                    className="prepare-button"
                    onClick={startPreparation}
                  >
                    Start 30s Preparation
                  </button>
                )}
                
                {isPreparing && (
                  <div className="preparation-status">
                    <p>Think about what you want to say...</p>
                    <button 
                      className="start-button"
                      onClick={startRecording}
                    >
                      Skip Prep & Start Speaking
                    </button>
                  </div>
                )}
                
                {!isPreparing && !isRecording && !feedback && (
                  <button 
                    className="start-button"
                    onClick={startRecording}
                  >
                    Start Speaking (Skip Prep)
                  </button>
                )}
                
                {isRecording && (
                  <div className="recording-buttons">
                    <div className="recording-status">
                      <div className="recording-indicator"></div>
                      <p>Recording... Speak clearly</p>
                    </div>
                    <button 
                      className="stop-button"
                      onClick={stopRecording}
                    >
                      Stop Recording
                    </button>
                  </div>
                )}
              </div>
              
              {transcript && !isRecording && (
                <div className="transcript-container">
                  <h3>Your Response:</h3>
                  <p className="transcript-text">{transcript}</p>
                  <div className="word-count">
                    Word count: {transcript.split(/\s+/).filter(w => w.trim().length > 0).length}
                  </div>
                </div>
              )}
              
              {feedback && (
                <div className="feedback-container">
                  <h3>Feedback</h3>
                  <div className="accuracy-meter">
                    <div 
                      className="accuracy-bar" 
                      style={{ 
                        width: `${feedback.score}%`,
                        backgroundColor: feedback.score >= 80 ? '#4caf50' : 
                                        feedback.score >= 60 ? '#ff9800' : '#f44336'
                      }}
                    ></div>
                    <span className="accuracy-value">{feedback.score}% Score</span>
                  </div>
                  
                  <div className="feedback-details">
                    <p><strong>Word Count:</strong> {feedback.wordCount}</p>
                    <p><strong>Key Points Covered:</strong> {feedback.keyPointsCovered} of {feedback.totalKeyPoints}</p>
                  </div>
                  
                  <p className="feedback-text">{feedback.text}</p>
                  
                  {detailedScore && (
                    <ScoreBreakdown scoreData={detailedScore} type="speaking" />
                  )}
                  
                  {feedback.score >= 60 && !isTopicCompleted(selectedTopic.id) && (
                    <div className="completion-notification">
                      <span className="checkmark">✓</span>
                      Congratulations! This topic has been marked as completed.
                    </div>
                  )}
                  
                  {feedback.score < 60 && (
                    <div className="retry-prompt">
                      <p>You need at least 60% score to mark this topic as completed.</p>
                      <button className="retry-button" onClick={tryAgain}>
                        Try Again
                      </button>
                    </div>
                  )}
                  
                  <button className="back-to-topics-button" onClick={handleBackToList}>
                    Back to Topic List
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpeakingTraining;