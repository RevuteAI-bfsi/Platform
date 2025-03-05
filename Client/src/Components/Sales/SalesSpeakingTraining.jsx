import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProgressBar from '../common/ProgressBar';
import progressService from '../../services/progressService';
import textToSpeechService from '../../services/TextToSpeechService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import '../Training/TrainingStyles.css';
import './SalesSpeakingStyles.css';

// Create a fallback if the JSON import fails
const fallbackSalesSpeakingQuestions = [
  {
    id: 'sales-q1',
    question: "Introduce yourself and explain your role as a sales representative.",
    level: 'Beginner'
  },
  {
    id: 'sales-q2',
    question: "How would you pitch our banking services to a potential customer?",
    level: 'Intermediate'
  },
  {
    id: 'sales-q3',
    question: "A customer objects that our interest rates are too high. How would you respond?",
    level: 'Advanced'
  }
];

const SalesSpeakingTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'question'
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const userId = localStorage.getItem('userId');
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [maxPlaysReached, setMaxPlaysReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [detailedScore, setDetailedScore] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  
  // Use consistent skill type detection
  const skillType = determineSkillType(location.pathname);

  // Load the speaking questions
  useEffect(() => {
    try {
      console.log('Initializing SalesSpeakingTraining component...');
      
      // Try to dynamically import the questions
      import('../../training/sales/salesSpeakingQuestions.json')
        .then((importedQuestions) => {
          console.log('Successfully loaded sales speaking questions:', importedQuestions.default);
          // Validate the imported data
          if (Array.isArray(importedQuestions.default) && importedQuestions.default.length > 0) {
            setQuestions(importedQuestions.default);
          } else {
            console.warn('Imported sales speaking questions have invalid format, using fallback');
            setQuestions(fallbackSalesSpeakingQuestions);
          }
          setContentLoaded(true);
        })
        .catch((err) => {
          console.error('Error importing sales speaking questions:', err);
          console.log('Using fallback questions instead');
          setQuestions(fallbackSalesSpeakingQuestions);
          setContentLoaded(true);
        });
    } catch (err) {
      console.error('Error in setup:', err);
      setError('Failed to initialize training. Please try again.');
      setQuestions(fallbackSalesSpeakingQuestions);
      setContentLoaded(true);
    }
  }, []);

  // Get learning topics based on skill type
  const getLearningTopics = useCallback(() => {
    if (skillType === 'sales') {
      return ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
    } else {
      return [];
    }
  }, [skillType]);

  // Check previous completion and dependencies
  useEffect(() => {
    const checkLearningCompletion = async () => {
      try {
        setLoading(true);
        
        if (!userId) {
          setError('User not logged in');
          navigate('/login');
          return;
        }
        
        console.log(`Checking learning completion for user ${userId}, skillType ${skillType}`);
        
        // Check localStorage for completion status (faster)
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
        
        setLearningCompleted(allLearningCompleted);
        
        // Only redirect if prerequisites are not met AND this isn't already on the training page
        // This prevents endless redirect loops
        if (!allLearningCompleted && !window.location.pathname.includes("/training/speaking")) {
          console.log(`Not all learning topics completed, redirecting to learning page`);
          navigate(`/${skillType}/learning/${learningTopics[0]}`);
          return;
        }
        
        await loadCompletedQuestions();
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
      checkLearningCompletion();
      initSpeechRecognition();
      textToSpeechService.resetPlayCount();
    }
    
    return () => {
      // Cleanup function to prevent memory leaks
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition already stopped');
        }
      }
      textToSpeechService.cancel();
    };
  }, [contentLoaded, navigate, userId, skillType, getLearningTopics, isRecording]);

  const loadCompletedQuestions = async () => {
    try {
      if (!userId) return;
      
      console.log(`Loading completed questions for user ${userId}`);
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const speakingAttempts = trainingProgress.speaking || [];
      const completed = speakingAttempts
        .filter(attempt => attempt.topicId && attempt.topicId.startsWith('sales-'))
        .map(result => result.topicId);
      
      console.log(`Found ${completed.length} completed sales speaking questions`);
      
      setCompletedQuestions(completed);
    } catch (error) {
      console.error('Error loading completed questions:', error);
      setError('Failed to load completed questions. Please try again.');
    }
  };

  const loadAttemptHistory = async () => {
    try {
      if (!userId) return;
      
      console.log(`Loading speaking attempt history for user ${userId}`);
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const speakingAttempts = trainingProgress.speaking || [];
      
      // Filter to only include sales speaking attempts
      const salesAttempts = speakingAttempts.filter(
        attempt => attempt.topicId && attempt.topicId.startsWith('sales-')
      );
      
      setAttemptHistory(salesAttempts);
    } catch (error) {
      console.error('Error loading attempt history:', error);
    }
  };

  const calculateCompletionPercentage = () => {
    if (!questions || !questions.length) return 0;
    return (completedQuestions.length / questions.length) * 100;
  };

  const isQuestionCompleted = (questionId) => completedQuestions.includes(questionId);

  const selectQuestion = (question) => {
    setSelectedQuestion(question);
    setTranscript('');
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);
    textToSpeechService.resetPlayCount();
    setViewMode('question');
  };

  const handlePlayAudio = async () => {
    if (!selectedQuestion) {
      setError('No question selected. Please select a question first.');
      return;
    }
    
    if (isPlaying) {
      textToSpeechService.pause();
      setIsPlaying(false);
    } else {
      if (textToSpeechService.isMaxPlaysReached(2)) {
        setMaxPlaysReached(true);
        return;
      }
      setIsPlaying(true);
      try {
        const result = await textToSpeechService.speak(selectedQuestion.question);
        console.log(`Playback complete. Play count: ${result.playCount}`);
        setIsPlaying(false);
        if (result.playCount >= 2) setMaxPlaysReached(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        setError("There was an error playing the audio. Please try again.");
      }
    }
  };

  const startRecording = () => {
    if (!selectedQuestion) {
      setError('No question selected. Please select a question first.');
      return;
    }

    if (recognitionRef.current) {
      setTranscript('');
      finalTranscriptRef.current = '';
      setFeedback(null);
      setDetailedScore(null);
      setIsRecording(true);
      
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition was not running');
      }
      
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Error starting speech recognition:", e);
          setError("Error starting speech recognition. Please try again.");
          setIsRecording(false);
        }
      }, 100);
    } else {
      setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      setIsRecording(false);
      
      // Process the recording result
      if (transcript) {
        analyzeResponse();
      }
    }
  };

  const analyzeResponse = () => {
    if (!selectedQuestion) {
      setError('No question selected. Please select a question first.');
      return;
    }
    
    try {
      // Simple analysis logic for the speaking response
      const words = transcript.split(/\s+/).filter(w => w.trim().length > 0);
      const wordCount = words.length;
      
      // Generate score and feedback
      let score = 0;
      let feedbackText = '';
      
      if (wordCount < 10) {
        feedbackText = "Your response was very brief. Try to develop your answer more thoroughly.";
        score = 30;
      } else if (wordCount < 25) {
        feedbackText = "Your response was somewhat short. Work on elaborating your points.";
        score = 50;
      } else if (wordCount < 40) {
        feedbackText = "Good start! Your response had reasonable length, but could include more details.";
        score = 70;
      } else {
        feedbackText = "Excellent! You provided a detailed response with good development.";
        score = 90;
      }
      
      // Add additional feedback based on content
      const relevanceScore = assessRelevance(selectedQuestion.question, transcript);
      score = Math.round((score + relevanceScore) / 2);
      
      // Create detailed score object
      const scoreData = {
        totalScore: Math.round(score / 10),
        percentageScore: score,
        metrics: {
          wordCount,
          fluency: {
            score: Math.min(5, Math.round((wordCount / 50) * 5)),
            maxScore: 5
          },
          content: {
            score: Math.min(5, Math.round(relevanceScore / 20)),
            maxScore: 5
          }
        }
      };
      
      setDetailedScore(scoreData);
      
      // Feedback object for UI display
      setFeedback({
        score,
        text: feedbackText,
        wordCount
      });
      
      // Save attempt if score is high enough
      if (score >= 60) {
        saveAttempt(selectedQuestion, score, transcript, wordCount);
      }
    } catch (error) {
      console.error('Error analyzing response:', error);
      setError('Error analyzing your response. Please try again.');
    }
  };

  // Simple relevance assessment based on keyword matching
  const assessRelevance = (question, response) => {
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const responseWords = response.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    questionWords.forEach(word => {
      if (responseWords.includes(word)) matchCount++;
    });
    
    return Math.min(100, Math.round((matchCount / questionWords.length) * 100));
  };

  const saveAttempt = async (question, score, transcriptText, wordCount) => {
    try {
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      const attempt = {
        topicId: question.id,
        title: question.question,
        score: score,
        transcript: transcriptText,
        metrics: {
          wordCount,
        },
        date: new Date().toISOString()
      };
      
      console.log(`Saving speaking attempt:`, attempt);
      
      await progressService.saveTrainingAttempt(userId, 'speaking', attempt);
      
      // Update local state
      if (!completedQuestions.includes(question.id)) {
        setCompletedQuestions([...completedQuestions, question.id]);
      }
      
      // Add to attempt history
      setAttemptHistory([...attemptHistory, attempt]);
      
      // Dispatch event to refresh progress in other components
      const progressEvent = new CustomEvent('progressUpdated', {
        detail: { userId, skillType, type: 'speaking', questionId: question.id }
      });
      window.dispatchEvent(progressEvent);
      
      console.log('Sales speaking attempt saved and progressUpdated event dispatched');
    } catch (error) {
      console.error('Error saving attempt:', error);
      setError('Failed to save your attempt. Please try again.');
    }
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedQuestion(null);
    setTranscript('');
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);
    
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      setIsRecording(false);
    }
    
    textToSpeechService.cancel();
    setIsPlaying(false);
  };

  const tryAgain = () => {
    setTranscript('');
    setFeedback(null);
    setDetailedScore(null);
    textToSpeechService.resetPlayCount();
    setMaxPlaysReached(false);
  };

  const hasCompletedEnough = () => {
    if (!questions || !questions.length) return false;
    return completedQuestions.length >= Math.ceil(questions.length * 0.5);
  };

  // Categorize questions by level
  const getQuestionsByLevel = () => {
    const categorized = {};
    
    questions.forEach(question => {
      const level = question.level || 'Beginner';
      
      if (!categorized[level]) {
        categorized[level] = [];
      }
      
      categorized[level].push(question);
    });
    
    return categorized;
  };

  // Categorize questions by completion status
  const getQuestionsByCompletion = () => {
    return {
      completed: questions.filter(q => isQuestionCompleted(q.id)),
      uncompleted: questions.filter(q => !isQuestionCompleted(q.id))
    };
  };

  // Get user's average score
  const getAverageScore = () => {
    if (attemptHistory.length === 0) return 0;
    
    const totalScore = attemptHistory.reduce((sum, attempt) => sum + attempt.score, 0);
    return Math.round(totalScore / attemptHistory.length);
  };

  return (
    <div className="training-container">
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading sales speaking training...</p>
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
            <h1>Sales Speaking Training</h1>
            <p className="training-description">
              Improve your sales communication skills by practicing responses to common scenarios.
              Listen to the question, then record your response to enhance your sales pitch skills.
            </p>
            
            <div className="training-progress">
              <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />
              
              {hasCompletedEnough() ? (
                <div className="progress-message success">
                  <span className="checkmark">✓</span>
                  Congratulations! You have completed the Sales Speaking module!
                </div>
              ) : (
                <div className="progress-message">
                  Complete {Math.ceil((questions ? questions.length : 0) * 0.5) - completedQuestions.length} more question(s) to complete this module.
                </div>
              )}
              
              {attemptHistory.length > 0 && (
                <div className="score-display">
                  <span>Average Score: </span>
                  <span className="score-value" style={{
                    color: getAverageScore() >= 80 ? '#4caf50' : 
                           getAverageScore() >= 60 ? '#ff9800' : '#f44336'
                  }}>{getAverageScore()}%</span>
                </div>
              )}
            </div>
          </div>
          
          {viewMode === 'overview' ? (
            <div className="speaking-overview">
              {Object.keys(getQuestionsByCompletion()).map(status => {
                const questions = getQuestionsByCompletion()[status];
                if (questions.length === 0) return null;
                
                return (
                  <div key={status} className="questions-section">
                    <h2>{status === 'completed' ? 'Completed Questions' : 'Questions to Complete'}</h2>
                    
                    <div className="cards-grid">
                      {questions.map(question => {
                        const attempt = attemptHistory.find(a => a.topicId === question.id);
                        
                        return (
                          <div 
                            key={question.id}
                            className={`question-card ${isQuestionCompleted(question.id) ? 'completed' : ''}`}
                            onClick={() => selectQuestion(question)}
                          >
                            <div className="question-card-header">
                              <span className="question-level">{question.level || 'Beginner'}</span>
                              {isQuestionCompleted(question.id) && (
                                <span className="completion-badge">
                                  <span className="completion-icon">✓</span>
                                  <span className="completion-score">{attempt ? attempt.score : 0}%</span>
                                </span>
                              )}
                            </div>
                            
                            <div className="question-card-content">
                              <p>{question.question}</p>
                            </div>
                            
                            <div className="question-card-footer">
                              <button className="practice-button">
                                {isQuestionCompleted(question.id) ? 'Practice Again' : 'Start Practice'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {attemptHistory.length > 0 && (
                <div className="attempt-history-section">
                  <h2>Recent Attempts</h2>
                  <table className="attempts-table">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Score</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attemptHistory.slice(-5).reverse().map((attempt, index) => {
                        const question = questions.find(q => q.id === attempt.topicId);
                        return (
                          <tr key={index}>
                            <td className="attempt-question">{question ? question.question : attempt.title}</td>
                            <td className="attempt-score" style={{
                              color: attempt.score >= 80 ? '#4caf50' : 
                                     attempt.score >= 60 ? '#ff9800' : '#f44336'
                            }}>{attempt.score}%</td>
                            <td className="attempt-date">{new Date(attempt.date).toLocaleDateString()}</td>
                            <td className="attempt-action">
                              <button 
                                className="retry-button"
                                onClick={() => selectQuestion(question || { id: attempt.topicId, question: attempt.title })}
                              >
                                Try Again
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="question-practice">
              <div className="practice-header">
                <h2>{selectedQuestion ? selectedQuestion.question : 'Loading...'}</h2>
                <button 
                  className="back-button"
                  onClick={handleBackToOverview}
                  disabled={isRecording}
                >
                  ← Back to Questions
                </button>
              </div>
              
              <div className="practice-content">
                <div className="practice-controls">
                  <div className="audio-section">
                    <h3>Listen to the Question</h3>
                    <button 
                      className={`play-button ${isPlaying ? 'playing' : ''}`}
                      onClick={handlePlayAudio}
                      disabled={!selectedQuestion || maxPlaysReached}
                    >
                      <span className="play-icon">{isPlaying ? '⏸️' : '▶️'}</span>
                      {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </button>
                    
                    {maxPlaysReached && (
                      <div className="max-plays-message">
                        <span className="info-icon">ℹ️</span>
                        Maximum plays reached. Please record your answer.
                      </div>
                    )}
                  </div>
                  
                  <div className="recording-section">
                    <h3>Record Your Response</h3>
                    
                    <div className="recording-buttons">
                      <button 
                        className={`record-button ${isRecording ? 'recording' : ''}`}
                        onClick={startRecording} 
                        disabled={isRecording || !selectedQuestion}
                      >
                        {isRecording ? 'Recording...' : 'Start Recording'}
                      </button>
                      
                      <button 
                        className="stop-button"
                        onClick={stopRecording} 
                        disabled={!isRecording}
                      >
                        Stop Recording
                      </button>
                    </div>
                    
                    {isRecording && (
                      <div className="recording-status">
                        <div className="recording-indicator"></div>
                        <p>Recording in progress... Speak clearly.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {transcript && !isRecording && (
                  <div className="transcript-container">
                    <h3>Your Response:</h3>
                    <div className="transcript-text">{transcript}</div>
                    <div className="word-count">
                      Word count: {transcript.split(/\s+/).filter(w => w.trim().length > 0).length}
                    </div>
                  </div>
                )}
                
                {feedback && (
                  <div className="feedback-container">
                    <h3>Feedback</h3>
                    
                    <div className="score-display">
                      <h4>Score: {feedback.score}%</h4>
                      <div className="score-meter">
                        <div 
                          className="score-bar" 
                          style={{ 
                            width: `${feedback.score}%`,
                            backgroundColor: feedback.score >= 80 ? '#4caf50' : 
                                          feedback.score >= 60 ? '#ff9800' : '#f44336'
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="feedback-text">{feedback.text}</div>
                    
                    <div className="analysis-details">
                      <div className="detail-item">
                        <span className="detail-label">Word Count:</span>
                        <span className="detail-value">{feedback.wordCount}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Fluency:</span>
                        <span className="detail-value">{
                          feedback.wordCount < 20 ? 'Needs Work' :
                          feedback.wordCount < 40 ? 'Satisfactory' : 'Good'
                        }</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Content Relevance:</span>
                        <span className="detail-value">{
                          feedback.score < 60 ? 'Needs Work' :
                          feedback.score < 80 ? 'Satisfactory' : 'Good'
                        }</span>
                      </div>
                    </div>
                    
                    <div className="action-buttons">
                      {feedback.score >= 60 ? (
                        <div className="completion-notification">
                          <span className="check-icon">✓</span>
                          <span>Question completed successfully!</span>
                        </div>
                      ) : (
                        <button className="retry-button" onClick={tryAgain}>
                          Try Again
                        </button>
                      )}
                      
                      <button className="next-button" onClick={handleBackToOverview}>
                        Back to Questions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesSpeakingTraining;