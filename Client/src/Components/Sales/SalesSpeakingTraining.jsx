import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import salesSpeakingQuestions from '../../training/sales/salesSpeakingQuestions.json';
import ProgressBar from '../common/ProgressBar';
import textToSpeechService from '../../services/TextToSpeechService';
import '../Training/TrainingStyles.css';

const SalesSpeakingTraining = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(salesSpeakingQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [maxPlaysReached, setMaxPlaysReached] = useState(false);
  
  // References
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  
  useEffect(() => {
    // Check if learning is completed
    const checkLearningCompletion = () => {
      try {
        const savedProgress = JSON.parse(localStorage.getItem('salesProgress') || '{}');
        const learningTopics = ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
        const allCompleted = learningTopics.every(topic => 
          savedProgress[topic] && savedProgress[topic].completed
        );
        
        setLearningCompleted(allCompleted);
        
        // Redirect if learning not completed
        if (!allCompleted) {
          navigate('/sales/learning/introduction');
        }
      } catch (error) {
        console.error('Error checking learning completion:', error);
      }
    };
    
    checkLearningCompletion();
    
    // Load completed questions
    loadCompletedQuestions();
    
    // Initialize Web Speech API for recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscriptSegment = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptSegment += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Only add to our saved transcript if we have final results
        if (finalTranscriptSegment) {
          finalTranscriptRef.current += ' ' + finalTranscriptSegment;
          setTranscript(finalTranscriptRef.current.trim());
        } else if (interimTranscript) {
          // Show interim results together with final results
          setTranscript(finalTranscriptRef.current + ' ' + interimTranscript);
        }
      };
      
      // Auto-restart recognition if it ends unexpectedly
      recognitionRef.current.onend = () => {
        if (isRecording) {
          // Add a small delay to avoid errors
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
        if (event.error === 'no-speech') {
          // Don't stop recording on no-speech error, just log it
          console.log('No speech detected, continuing to listen...');
        } else {
          // Stop for other errors
          stopRecording();
        }
      };
    }
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition was already stopped');
        }
      }
      
      // Cancel any ongoing speech synthesis
      textToSpeechService.cancel();
    };
  }, [isRecording, navigate]);
  
  // Load completed questions from localStorage
  const loadCompletedQuestions = () => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('salesTrainingResults') || '{}');
      if (!trainingResults.speaking) {
        trainingResults.speaking = [];
      }
      
      const completed = trainingResults.speaking.map(result => result.questionId);
      setCompletedQuestions(completed);
    } catch (error) {
      console.error('Error loading completed questions:', error);
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    return (completedQuestions.length / questions.length) * 100;
  };
  
  // Check if question is completed
  const isQuestionCompleted = (questionId) => {
    return completedQuestions.includes(questionId);
  };
  
  // Get current question
  const getCurrentQuestion = () => {
    return questions[currentQuestionIndex];
  };
  
  // Handle playing the question audio
  const handlePlayAudio = async () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;
    
    if (isPlaying) {
      // Pause speech if currently playing
      textToSpeechService.pause();
      setIsPlaying(false);
    } else {
      // Check if max plays reached
      if (textToSpeechService.isMaxPlaysReached(2)) {
        setMaxPlaysReached(true);
        return;
      }
      
      // Start playing the audio
      setIsPlaying(true);
      
      try {
        // Use the text from the question
        const result = await textToSpeechService.speak(currentQuestion.question);
        console.log(`Playback complete. Play count: ${result.playCount}`);
        setIsPlaying(false);
        
        // Check if max plays reached after playback
        if (result.playCount >= 2) {
          setMaxPlaysReached(true);
        }
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        alert("There was an error playing the audio. Please try again.");
      }
    }
  };
  
  // Start recording user's speech response
  const startRecording = () => {
    if (recognitionRef.current) {
      // Start recording
      setTranscript('');
      finalTranscriptRef.current = '';
      setIsRecording(true);
      
      // First ensure recognition is not running
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore error if recognition was not running
      }
      
      // Small delay to ensure recognition has fully stopped
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Error starting speech recognition:", e);
          alert("There was an error starting speech recognition. Please try again.");
          setIsRecording(false);
        }
      }, 100);
    } else {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition was already stopped');
      }
      setIsRecording(false);
      
      // Analyze response
      analyzeResponse();
    }
  };
  
  // Analyze the response and provide feedback
  const analyzeResponse = () => {
    const currentQuestion = getCurrentQuestion();
    
    // Simple keyword matching for demonstration
    const responseScore = calculateResponseScore(transcript, currentQuestion.keyPhrases);
    
    // Generate feedback based on score
    let feedbackText;
    if (responseScore >= 80) {
      feedbackText = "Excellent response! You covered the key points effectively.";
    } else if (responseScore >= 60) {
      feedbackText = "Good response. You addressed most of the important points.";
    } else if (responseScore >= 40) {
      feedbackText = "Your response included some key points but missed others.";
    } else {
      feedbackText = "Try to incorporate more of the key phrases in your response.";
    }
    
    setFeedback({
      score: responseScore,
      text: feedbackText,
      matchedPhrases: getMatchedPhrases(transcript, currentQuestion.keyPhrases)
    });
    
    // Save attempt if score is high enough
    if (responseScore >= 60) {
      saveAttempt(currentQuestion, responseScore);
    }
  };
  
  // Calculate response score based on key phrases matches
  const calculateResponseScore = (response, keyPhrases) => {
    const lowerResponse = response.toLowerCase();
    let matchCount = 0;
    
    keyPhrases.forEach(phrase => {
      if (lowerResponse.includes(phrase.toLowerCase())) {
        matchCount++;
      }
    });
    
    return Math.round((matchCount / keyPhrases.length) * 100);
  };
  
  // Get matched phrases for display
  const getMatchedPhrases = (response, keyPhrases) => {
    const lowerResponse = response.toLowerCase();
    return keyPhrases.filter(phrase => 
      lowerResponse.includes(phrase.toLowerCase())
    );
  };
  
  // Save attempt to localStorage
  const saveAttempt = (question, score) => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('salesTrainingResults') || '{}');
      if (!trainingResults.speaking) {
        trainingResults.speaking = [];
      }
      
      const newAttempt = {
        questionId: question.id,
        question: question.question,
        date: new Date().toISOString(),
        transcript: transcript,
        score: score
      };
      
      trainingResults.speaking.push(newAttempt);
      localStorage.setItem('salesTrainingResults', JSON.stringify(trainingResults));
      
      // Update completed questions
      if (!isQuestionCompleted(question.id)) {
        setCompletedQuestions([...completedQuestions, question.id]);
      }
    } catch (error) {
      console.error('Error saving attempt:', error);
    }
  };
  
  // Move to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
    } else {
      // All questions completed, show completion
      alert("Congratulations! You've completed all questions in this training module.");
    }
  };
  
  // Go back to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      resetQuestionState();
    }
  };
  
  // Reset state for a new question
  const resetQuestionState = () => {
    setTranscript('');
    finalTranscriptRef.current = '';
    setFeedback(null);
    setIsPlaying(false);
    setIsRecording(false);
    setMaxPlaysReached(false);
    textToSpeechService.resetPlayCount();
  };
  
  // Try the same question again
  const handleTryAgain = () => {
    resetQuestionState();
  };
  
  // Format completion status for display
  const formatCompletionStatus = () => {
    return `${completedQuestions.length}/${questions.length} completed`;
  };

  return (
    <div className="training-container">
      <div className="training-header">
        <h1>Sales Speech Training</h1>
        <p className="training-description">
          Listen to the question, then speak your response. Your speech will be analyzed to provide feedback.
          Complete at least 60% of the questions to master this module.
        </p>
        
        <div className="training-progress">
          <h3>Training Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
          <ProgressBar percentage={calculateCompletionPercentage()} />
          <div className="progress-message">
            {formatCompletionStatus()}
          </div>
        </div>
      </div>
      
      <div className="speaking-practice">
        <div className="question-navigation">
          <button 
            className="nav-button previous"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            ← Previous
          </button>
          <span className="question-counter">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <button 
            className="nav-button next"
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            Next →
          </button>
        </div>
        
        {getCurrentQuestion() && (
          <>
            <div className="audio-player">
              <p className="instruction">
                Listen to the question (up to 2 times), then speak your response.
              </p>
              
              <button 
                className={`play-button ${isPlaying ? 'playing' : ''} ${maxPlaysReached ? 'disabled' : ''}`}
                onClick={handlePlayAudio}
                disabled={maxPlaysReached || isRecording}
              >
                {isPlaying ? 'Pause Audio' : maxPlaysReached ? 'Max Plays Reached' : 'Play Question'}
              </button>
              
              <p className="play-count">
                Plays: {textToSpeechService.getPlayCount()}/2
              </p>
              
              {!isRecording && !feedback && (
                <button 
                  className="start-button"
                  onClick={startRecording}
                  disabled={isPlaying}
                >
                  Start Speaking
                </button>
              )}
              
              {isRecording && (
                <div className="recording-status">
                  <div className="recording-indicator"></div>
                  <p>Recording... Speak your response clearly</p>
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
                  <span className="accuracy-value">{feedback.score}% Match</span>
                </div>
                
                <p className="feedback-text">{feedback.text}</p>
                
                <div className="key-phrases">
                  <h4>Key Phrases Matched:</h4>
                  {feedback.matchedPhrases.length > 0 ? (
                    <ul>
                      {feedback.matchedPhrases.map((phrase, index) => (
                        <li key={index}>{phrase}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No key phrases matched. Try to incorporate them in your response.</p>
                  )}
                </div>
                
                {isQuestionCompleted(getCurrentQuestion().id) && (
                  <div className="completion-notification">
                    <span className="checkmark">✓</span>
                    This question has been marked as completed.
                  </div>
                )}
                
                <div className="action-buttons">
                  <button 
                    className="try-again-button"
                    onClick={handleTryAgain}
                  >
                    Try Again
                  </button>
                  
                  {currentQuestionIndex < questions.length - 1 && (
                    <button 
                      className="next-button"
                      onClick={handleNextQuestion}
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="question-info">
              <h3>Question Information</h3>
              <p>{getCurrentQuestion().question}</p>
              
              {feedback && (
                <div className="sample-answer">
                  <h4>Sample Answer Points:</h4>
                  <ul>
                    {getCurrentQuestion().keyPhrases.map((phrase, index) => (
                      <li key={index} className={feedback.matchedPhrases.includes(phrase) ? 'matched' : ''}>
                        {phrase}
                        {feedback.matchedPhrases.includes(phrase) && <span className="match-indicator"> ✓</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesSpeakingTraining;