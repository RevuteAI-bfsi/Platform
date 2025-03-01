import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import speakingTopics from '../../training/speakingTopics.json';
import ProgressBar from '../common/ProgressBar';
import './TrainingStyles.css';

const SpeakingTraining = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState(speakingTopics);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [previousModulesCompleted, setPreviousModulesCompleted] = useState(false);
  
  // References
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  
  useEffect(() => {
    // Check if prerequisites are met
    const checkPreviousCompletion = () => {
      try {
        // Check learning completion
        const savedLearningProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
        const learningTopics = ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
        const allLearningCompleted = learningTopics.every(topic => 
          savedLearningProgress[topic] && savedLearningProgress[topic].completed
        );
        
        setLearningCompleted(allLearningCompleted);
        
        // Check if previous training modules are at least 50% completed
        const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
        
        // Default empty arrays if not exist
        if (!trainingResults.reading) trainingResults.reading = [];
        if (!trainingResults.listening) trainingResults.listening = [];
        
        const readingCompletionPercentage = (trainingResults.reading.length / 5) * 100; // Assuming 5 total
        const listeningCompletionPercentage = (trainingResults.listening.length / 5) * 100; // Assuming 5 total
        
        const areModulesCompleted = 
          readingCompletionPercentage >= 50 && 
          listeningCompletionPercentage >= 50;
        
        setPreviousModulesCompleted(areModulesCompleted);
        
        // Redirect if prerequisites not met
        if (!allLearningCompleted) {
          navigate('/learning/parts-of-speech');
        } else if (!areModulesCompleted) {
          // Check which module to redirect to
          if (readingCompletionPercentage < 50) {
            navigate('/training/reading');
          } else {
            navigate('/training/listening');
          }
        }
      } catch (error) {
        console.error('Error checking completion:', error);
      }
    };
    
    checkPreviousCompletion();
    
    // Load completed topics
    loadCompletedTopics();
    
    // Initialize Web Speech API
    // Initialize Web Speech API
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    
    // Create a ref to store the final transcript across events
    const finalTranscriptRef = { current: '' };
  
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Update state with the accumulated final transcript plus the current interim transcript
      setTranscript(finalTranscriptRef.current + ' ' + interimTranscript);
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopRecording();
    };
  }
  
    
    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, navigate]);
  
  // Load completed topics from localStorage
  const loadCompletedTopics = () => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.speaking) {
        trainingResults.speaking = [];
      }
      
      const completed = trainingResults.speaking.map(result => result.topicId);
      setCompletedTopics(completed);
    } catch (error) {
      console.error('Error loading completed topics:', error);
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    return (completedTopics.length / topics.length) * 100;
  };
  
  // Check if topic is completed
  const isTopicCompleted = (topicId) => {
    return completedTopics.includes(topicId);
  };
  
  const selectTopic = (topic) => {
    setSelectedTopic(topic);
    setTranscript('');
    setIsPreparing(false);
    setIsRecording(false);
    setTimeLeft(0);
    setFeedback(null);
  };
  
  const startPreparation = () => {
    setIsPreparing(true);
    setTimeLeft(30); // 30 seconds preparation time
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          // Automatically start recording when prep time is over
          startRecording();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };
  
  // Only modify the necessary parts of the startRecording function
  const startRecording = () => {
    if (recognitionRef.current) {
      // End preparation phase if active
      if (isPreparing) {
        setIsPreparing(false);
        clearInterval(timerRef.current);
      }
      
      // Start recording
      setTranscript('');
      finalTranscriptRef.current = '';
      setIsRecording(true);
      setTimeLeft(selectedTopic.timeLimit); // Set timer to topic time limit
      
      // Make sure recognition is not already running
      try {
        // If it's already running, stop it first
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition was not running, starting fresh.');
      }
      
      // Add a small delay before starting recognition
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
          alert('There was an error starting speech recognition. Please try again.');
          setIsRecording(false);
        }
      }, 300); // Increased delay to ensure previous instance has time to stop
      
      // Start timer
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
    } else {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }
  };
    
  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      
      // Analyze and give feedback
      analyzeResponse();
    }
  };
  
  const analyzeResponse = () => {
    // Simple analysis for demonstration purposes
    
    const words = transcript.split(/\s+/).filter(w => w.trim().length > 0);
    const wordCount = words.length;
    
    // Check if speech covered key points (basic implementation)
    const keyPointsCovered = selectedTopic.keyPoints.filter(point => {
      const keywords = point.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      return keywords.some(keyword => 
        transcript.toLowerCase().includes(keyword)
      );
    }).length;
    
    const keyPointsPercentage = Math.round((keyPointsCovered / selectedTopic.keyPoints.length) * 100);
    
    // Generate feedback
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
    
    // Add feedback about key points
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
    
    setFeedback({
      score,
      text: feedbackText,
      wordCount,
      keyPointsCovered,
      totalKeyPoints: selectedTopic.keyPoints.length
    });
    
    // Save training result to localStorage (only if not already completed)
    if (!isTopicCompleted(selectedTopic.id) && score >= 60) {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.speaking) {
        trainingResults.speaking = [];
      }
      
      trainingResults.speaking.push({
        topicId: selectedTopic.id,
        title: selectedTopic.title,
        date: new Date().toISOString(),
        transcript: transcript,
        wordCount: wordCount,
        score: score
      });
      
      localStorage.setItem('trainingResults', JSON.stringify(trainingResults));
      
      // Update completed topics
      setCompletedTopics([...completedTopics, selectedTopic.id]);
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
    setIsPreparing(false);
    setIsRecording(false);
    setTimeLeft(0);
  };
  
  // Check if user has completed at least 50% of topics
  const hasCompletedEnough = () => {
    return completedTopics.length >= Math.ceil(topics.length * 0.5);
  };
  
  // Show completion message when all modules are completed
  const showCompletionMessage = () => {
    return hasCompletedEnough();
  };

  return (
    <div className="training-container">
      <div className="training-header">
        <h1>Speaking Practice</h1>
        <p className="training-description">
          Improve your speaking skills by responding to prompts.
          You'll have time to prepare, then record your response.
          Complete at least 50% of the topics to complete this module.
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
              Complete {Math.ceil(topics.length * 0.5) - completedTopics.length} more 
              topic(s) to complete this module.
            </div>
          )}
          
          {showCompletionMessage() && (
            <div className="module-completion">
              <h3>Soft Skills Training Complete!</h3>
              <p>You have successfully completed all required modules of the Soft Skills training.</p>
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
                  {isTopicCompleted(topic.id) && (
                    <span className="card-completed">Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
          
          <div className="tips-section">
            <h3>Speaking Tips:</h3>
            <ul className="tips-list">
              {selectedTopic.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
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
                    backgroundColor: feedback.score >= 80 ? '#4caf50' : feedback.score >= 60 ? '#ff9800' : '#f44336'
                  }}
                ></div>
                <span className="accuracy-value">{feedback.score}% Score</span>
              </div>
              
              <div className="feedback-details">
                <p><strong>Word Count:</strong> {feedback.wordCount}</p>
                <p><strong>Key Points Covered:</strong> {feedback.keyPointsCovered} of {feedback.totalKeyPoints}</p>
              </div>
              
              <p className="feedback-text">{feedback.text}</p>
              
              {feedback.score >= 60 && !isTopicCompleted(selectedTopic.id) && (
                <div className="completion-notification">
                  <span className="checkmark">✓</span>
                  Congratulations! This topic has been marked as completed.
                </div>
              )}
              
              {feedback.score < 60 && (
                <div className="retry-prompt">
                  <p>You need at least 60% score to mark this topic as completed.</p>
                  <button 
                    className="retry-button"
                    onClick={tryAgain}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpeakingTraining;