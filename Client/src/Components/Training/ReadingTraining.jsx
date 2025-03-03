import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import readingPassages from '../../training/readingPassages.json';
import ProgressBar from '../common/ProgressBar';
import ScoreBreakdown from '../common/ScoreBreakdown';
import AttemptHistory from '../common/AttemptHistory';
import useGeminiAnalysis from '../../hooks/useGeminiAnalysis';
import AIAnalysis from '../common/AIAnalysis';
import './TrainingStyles.css';

const ReadingTraining = () => {
  const navigate = useNavigate();
  const [passages, setPassages] = useState([]);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [completedPassages, setCompletedPassages] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [detailedScore, setDetailedScore] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  
  // Define accuracy threshold constant
  const ACCURACY_THRESHOLD = 10;
  
  // For AI Analysis
  const { analysis, isAnalyzing, error, analyzeReading, clearAnalysis } = useGeminiAnalysis();
  
  // For Web Speech API
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    // Check if learning is completed
    const checkLearningCompletion = () => {
      try {
        const savedProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
        const learningTopics = ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
        const allCompleted = learningTopics.every(topic => 
          savedProgress[topic] && savedProgress[topic].completed
        );
        
        setLearningCompleted(allCompleted);
        
        // Redirect if learning not completed
        if (!allCompleted) {
          navigate('/learning/parts-of-speech');
        }
      } catch (error) {
        console.error('Error checking learning completion:', error);
      }
    };
    
    checkLearningCompletion();
    
    // Load passages
    setPassages(readingPassages);
    
    // Load completed passages
    loadCompletedPassages();
    
    // Initialize Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Set language to English for better accuracy (modify as needed)
      recognitionRef.current.lang = 'en-US';
      
      // These settings improve performance and real-time feedback
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      
      // Increase the buffer size to handle longer phrases
      if ('speechGrammarList' in window || 'webkitSpeechGrammarList' in window) {
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammar = '#JSGF V1.0;';
        const speechGrammarList = new SpeechGrammarList();
        speechGrammarList.addFromString(grammar, 1);
        recognitionRef.current.grammars = speechGrammarList;
      }
      
      // Handle results with better concatenation
      let finalTranscriptBuffer = '';
      
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
        
        if (finalTranscriptSegment) {
          finalTranscriptBuffer += ' ' + finalTranscriptSegment;
          setTranscript(finalTranscriptBuffer.trim());
        } else if (interimTranscript) {
          // Show interim results together with final results for immediate feedback
          setTranscript(finalTranscriptBuffer + ' ' + interimTranscript);
        }
      };
      
      // Restart recognition if it ends unexpectedly
      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start();
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
    } else {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }
    
    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, navigate]);
  
  // Load completed passages from localStorage
  const loadCompletedPassages = () => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.reading) {
        trainingResults.reading = [];
      }
      
      const completed = trainingResults.reading.map(result => result.passageId);
      setCompletedPassages(completed);
    } catch (error) {
      console.error('Error loading completed passages:', error);
    }
  };
  
  // Load attempt history for the selected passage
  const loadAttemptHistory = (passageId) => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.reading) {
        trainingResults.reading = [];
      }
      
      const history = trainingResults.reading.filter(result => 
        result.passageId === passageId
      );
      
      setAttemptHistory(history);
    } catch (error) {
      console.error('Error loading attempt history:', error);
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    return (completedPassages.length / passages.length) * 100;
  };
  
  // Check if passage is completed
  const isPassageCompleted = (passageId) => {
    return completedPassages.includes(passageId);
  };
  
  const selectPassage = (passage) => {
    setSelectedPassage(passage);
    setTranscript('');
    setAccuracy(null);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    clearAnalysis();
    loadAttemptHistory(passage.id);
  };
  
  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setAccuracy(null);
      setFeedback(null);
      setDetailedScore(null);
      setShowAIAnalysis(false);
      clearAnalysis();
      
      setRecordingStartTime(Date.now());
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }
  };
  
  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      // Temporarily remove the onend callback to prevent auto-restart
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      setIsRecording(false);
  
      if (selectedPassage && transcript) {
        setTimeout(() => {
          calculateDetailedScore();
        }, 500);
      }
    }
  };
  
  
  const calculateDetailedScore = async () => {
    // Basic cleanup
    const cleanOriginal = selectedPassage.text.toLowerCase().replace(/[^\w\s.,!?;]/g, "");
    const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s.,!?;]/g, "");
    
    // Split into words but preserve punctuation for pause analysis
    const originalWords = cleanOriginal.split(/\s+/);
    const transcriptWords = cleanTranscript.split(/\s+/);
    
    // Track metrics
    let metrics = {
      contentAccuracy: {
        correctWords: 0,
        totalWords: originalWords.length,
        misspelledWords: [],
        score: 0 // Out of 5
      },
      speechPatterns: {
        pausesAtPunctuation: {
          detected: 0,
          expected: 0,
          score: 0 // Out of 2
        },
        speaking: {
          duration: (Date.now() - recordingStartTime) / 1000, // in seconds
          expectedDuration: originalWords.length * 0.5, // rough estimate: 0.5s per word
          score: 0 // Out of 1
        },
        intonation: {
          score: 2 // Default score, hard to measure without advanced API
        }
      },
      attemptScore: 3 // Automatic points for attempting
    };
    
    // 1. Calculate Content Accuracy (5 points)
    // Count correct words and identify misspelled ones
    for (let i = 0; i < Math.min(originalWords.length, transcriptWords.length); i++) {
      const original = originalWords[i].replace(/[.,!?;]/g, "");
      const transcript = transcriptWords[i].replace(/[.,!?;]/g, "");
      
      if (original === transcript) {
        metrics.contentAccuracy.correctWords++;
      } else {
        // Check for close matches (simple spelling errors)
        if (calculateLevenshteinDistance(original, transcript) <= 2) {
          // Close enough, count as half correct
          metrics.contentAccuracy.correctWords += 0.5;
          metrics.contentAccuracy.misspelledWords.push({
            original,
            transcribed: transcript,
            position: i
          });
        } else {
          metrics.contentAccuracy.misspelledWords.push({
            original,
            transcribed: transcript,
            position: i
          });
        }
      }
    }
    
    // Calculate content accuracy score (out of 5)
    const accuracyPercentage = metrics.contentAccuracy.correctWords / metrics.contentAccuracy.totalWords;
    metrics.contentAccuracy.score = Math.min(5, Math.round(accuracyPercentage * 5));
    
    // 2. Calculate speech pattern metrics
    
    // 2.1 Pause detection (approximation based on punctuation)
    // Count expected pauses (punctuation marks)
    const punctuationMatches = selectedPassage.text.match(/[.,!?;]/g);
    metrics.speechPatterns.pausesAtPunctuation.expected = punctuationMatches ? punctuationMatches.length : 0;
    
    // Simple approximation for pause detection
    // In a real implementation, we would use timestamps from the Speech API
    // Here we'll assume 50% of pauses were correctly made
    metrics.speechPatterns.pausesAtPunctuation.detected = 
      Math.floor(metrics.speechPatterns.pausesAtPunctuation.expected * 0.5);
    
    // Calculate pause score (out of 2)
    const pausePercentage = metrics.speechPatterns.pausesAtPunctuation.expected > 0 ?
      metrics.speechPatterns.pausesAtPunctuation.detected / metrics.speechPatterns.pausesAtPunctuation.expected : 0;
    metrics.speechPatterns.pausesAtPunctuation.score = Math.min(2, Math.round(pausePercentage * 2));
    
    // 2.2 Speaking duration appropriateness
    // Calculate duration score based on how close the actual duration is to expected
    const durationRatio = metrics.speechPatterns.speaking.duration / metrics.speechPatterns.speaking.expectedDuration;
    // Score is highest when ratio is between 0.8 and 1.2 (acceptable range)
    if (durationRatio >= 0.8 && durationRatio <= 1.2) {
      metrics.speechPatterns.speaking.score = 1;
    } else if (durationRatio >= 0.6 && durationRatio <= 1.4) {
      metrics.speechPatterns.speaking.score = 0.5;
    } else {
      metrics.speechPatterns.speaking.score = 0;
    }
    
    // 3. Calculate total score
    const totalScore = 
      metrics.attemptScore + 
      metrics.contentAccuracy.score + 
      metrics.speechPatterns.pausesAtPunctuation.score + 
      metrics.speechPatterns.intonation.score + 
      metrics.speechPatterns.speaking.score;
    
    // Convert to percentage for display
    const percentageScore = Math.round((totalScore / 10) * 100);
    
    // Set the detailed score
    const scoreData = {
      metrics,
      totalScore,
      percentageScore
    };
    
    setDetailedScore(scoreData);
    
    // Also update the simple accuracy for backward compatibility
    setAccuracy(percentageScore);
    
    // Generate feedback
    if (percentageScore >= 90) {
      setFeedback("Excellent! Your reading is very accurate and clear.");
    } else if (percentageScore >= 70) {
      setFeedback("Good job! There's some room for improvement in your reading accuracy.");
    } else if (percentageScore >= 50) {
      setFeedback("You're making progress. Try to read more slowly and clearly for better results.");
    } else {
      setFeedback("Keep practicing! Try reading more slowly and focus on pronunciation.");
    }
    
    // Changed from 70% to 10% threshold for completion
    if (!isPassageCompleted(selectedPassage.id) && percentageScore >= ACCURACY_THRESHOLD) {
      saveAttempt(scoreData);
    } else {
      // Always save to attempt history
      saveAttemptToHistory(scoreData);
    }
    
    // Now, if automatic AI analysis is desired, uncomment the following:
    // setShowAIAnalysis(true);
    // await analyzeReading(selectedPassage.text, transcript);
  };
  
  // Helper function to calculate Levenshtein distance for spelling comparison
  const calculateLevenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };
  
  // Save attempt to localStorage and mark as completed if score is high enough
  const saveAttempt = (scoreData) => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.reading) {
        trainingResults.reading = [];
      }
      
      const newAttempt = {
        passageId: selectedPassage.id,
        title: selectedPassage.title,
        date: new Date().toISOString(),
        accuracy: scoreData.percentageScore,
        transcript: transcript,
        detailedMetrics: scoreData.metrics
      };
      
      trainingResults.reading.push(newAttempt);
      localStorage.setItem('trainingResults', JSON.stringify(trainingResults));
      
      // Update completed passages
      setCompletedPassages([...completedPassages, selectedPassage.id]);
      
      // Update attempt history
      setAttemptHistory([...attemptHistory, newAttempt]);
      
    } catch (error) {
      console.error('Error saving attempt:', error);
    }
  };
  
  // Save attempt to history without marking as completed
  const saveAttemptToHistory = (scoreData) => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.readingHistory) {
        trainingResults.readingHistory = [];
      }
      
      const newAttempt = {
        passageId: selectedPassage.id,
        title: selectedPassage.title,
        date: new Date().toISOString(),
        accuracy: scoreData.percentageScore,
        transcript: transcript,
        detailedMetrics: scoreData.metrics
      };
      
      trainingResults.readingHistory.push(newAttempt);
      localStorage.setItem('trainingResults', JSON.stringify(trainingResults));
      
      // Update attempt history
      setAttemptHistory([...attemptHistory, newAttempt]);
      
    } catch (error) {
      console.error('Error saving attempt to history:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedPassage(null);
    setTranscript('');
    setAccuracy(null);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    clearAnalysis();
  };
  
  // Check if user has completed at least 50% of passages
  const hasCompletedEnough = () => {
    return completedPassages.length >= Math.ceil(passages.length * 0.5);
  };
  
  // Get next training module
  const goToNextModule = () => {
    navigate('/training/listening');
  };
  
  // Request AI analysis
  const requestAIAnalysis = async () => {
    setShowAIAnalysis(true);
    await analyzeReading(selectedPassage.text, transcript);
  };
  
  // Try again
  const handleTryAgain = () => {
    setTranscript('');
    setAccuracy(null);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    clearAnalysis();
  };

  return (
    <div className="training-container">
      <div className="training-header">
        <h1>Reading Practice</h1>
        <p className="training-description">
          Improve your pronunciation and reading fluency by reading passages aloud.
          Complete at least 50% of the passages to unlock the next training module.
        </p>
        
        <div className="training-progress">
          <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
          <ProgressBar percentage={calculateCompletionPercentage()} />
          
          {hasCompletedEnough() ? (
            <div className="progress-message success">
              <span className="checkmark">✓</span>
              You have completed enough passages to move to the next module!
            </div>
          ) : (
            <div className="progress-message">
              Complete {Math.ceil(passages.length * 0.5) - completedPassages.length} more 
              passage(s) to unlock the next module.
            </div>
          )}
          
          {hasCompletedEnough() && (
            <button 
              className="next-module-button"
              onClick={goToNextModule}
            >
              Go to Listening & Writing
            </button>
          )}
        </div>
      </div>
      
      {!selectedPassage ? (
        <div className="passage-list">
          <h2>Select a Passage to Read</h2>
          <div className="cards-grid">
            {passages.map(passage => (
              <div 
                className={`training-card ${isPassageCompleted(passage.id) ? 'completed' : ''}`}
                key={passage.id}
                onClick={() => selectPassage(passage)}
              >
                <h3>
                  {passage.title}
                  {isPassageCompleted(passage.id) && <span className="card-checkmark">✓</span>}
                </h3>
                <div className="card-content">
                  <p>{passage.text.substring(0, 100)}...</p>
                </div>
                <div className="card-footer">
                  <span className="card-level">{passage.level}</span>
                  {isPassageCompleted(passage.id) && (
                    <span className="card-completed">Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="passage-practice">
          <div className="passage-header">
            <h2>{selectedPassage.title}</h2>
            <button className="back-button" onClick={handleBackToList}>
              ← Back to passages
            </button>
          </div>
          
          <div className="passage-content">
            <p>{selectedPassage.text}</p>
          </div>
          
          <div className="practice-controls">
            {!isRecording ? (
              <button 
                className="start-button"
                onClick={startRecording}
                disabled={isRecording}
              >
                Start Reading
              </button>
            ) : (
              <button 
                className="stop-button"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            )}
          </div>
          
          {isRecording && (
            <div className="recording-status">
              <div className="recording-indicator"></div>
              <p>Recording... Speak clearly into your microphone</p>
            </div>
          )}
          
          {transcript && (
            <div className="transcript-container">
              <h3>Your Reading</h3>
              <p className="transcript-text">{transcript}</p>
            </div>
          )}
          
          {accuracy !== null && (
            <div className="feedback-container">
              <h3>Feedback</h3>
              <div className="accuracy-meter">
                <div 
                  className="accuracy-bar" 
                  style={{ 
                    width: `${accuracy}%`,
                    backgroundColor: accuracy >= 90 ? '#4caf50' : accuracy >= 70 ? '#ff9800' : '#f44336'
                  }}
                ></div>
                <span className="accuracy-value">{accuracy}% Accuracy</span>
              </div>
              <p className="feedback-text">{feedback}</p>
              
              {accuracy >= ACCURACY_THRESHOLD && !isPassageCompleted(selectedPassage.id) && (
                <div className="completion-notification">
                  <span className="checkmark">✓</span>
                  Congratulations! This passage has been marked as completed.
                </div>
              )}
              
              {accuracy < ACCURACY_THRESHOLD && (
                <div className="retry-prompt">
                  <p>You need at least {ACCURACY_THRESHOLD}% accuracy to mark this passage as completed.</p>
                  <button 
                    className="retry-button"
                    onClick={handleTryAgain}
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {!showAIAnalysis ? (
                <div className="ai-analysis-option">
                  <p>Want more detailed feedback?</p>
                  <button 
                    className="ai-analysis-button"
                    onClick={requestAIAnalysis}
                  >
                    Get AI Analysis
                  </button>
                </div>
              ) : (
                <AIAnalysis 
                  analysis={analysis}
                  type="reading"
                  isLoading={isAnalyzing}
                  error={error}
                />
              )}
            </div>
          )}
          
          {detailedScore && (
            <ScoreBreakdown 
              scoreData={detailedScore} 
              type="reading" 
            />
          )}
          
          <AttemptHistory 
            attempts={attemptHistory} 
            exerciseType="reading" 
          />
        </div>
      )}
    </div>
  );
};

export default ReadingTraining;