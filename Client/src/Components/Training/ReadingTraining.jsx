import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import readingPassages from '../../training/readingPassages.json';
import ProgressBar from '../common/ProgressBar';
import ScoreBreakdown from '../common/ScoreBreakdown';
import AttemptHistory from '../common/AttemptHistory';
import useGeminiAnalysis from '../../hooks/useGeminiAnalysis';
import AIAnalysis from '../common/AIAnalysis';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import './TrainingStyles.css';

const ReadingTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { analysis, isAnalyzing, error: aiError, analyzeReading, clearAnalysis } = useGeminiAnalysis();
  const recognitionRef = useRef(null);
  
  // Get the current skill type from URL
  const skillType = determineSkillType(location.pathname);

  // Check if learning modules are completed
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        await checkLearningCompletion();
        setPassages(readingPassages);
        initializeSpeechRecognition();
      } catch (error) {
        console.error('Error in component initialization:', error);
        setError('Failed to initialize component. Please try again.');
        setLoading(false);
      }
    };
    
    initializeComponent();
    
    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, [navigate]);

  // This function checks if the learning modules have been completed
  const checkLearningCompletion = async () => {
    try {
      setLoading(true);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      console.log('Checking learning completion for reading training');
      
      // First check localStorage for completion status (faster)
      const completedTopicsFromStorage = JSON.parse(
        localStorage.getItem('softskills_completed') || '[]'
      );
      
      const learningTopics = ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
      
      // Check if all required topics are in localStorage
      const allCompletedInStorage = learningTopics.every(topic => 
        completedTopicsFromStorage.includes(topic)
      );
      
      console.log(`Learning completion status from localStorage: ${allCompletedInStorage}`);
      
      if (allCompletedInStorage) {
        setLearningCompleted(true);
        await loadCompletedPassages();
        setLoading(false);
        return;
      }
      
      // If not found in localStorage, check the server
      const { learningProgress } = await progressService.getUserProgress(userId);
      const softskillsProgress = learningProgress.softskills || {};
      
      // Log what we found for debugging
      learningTopics.forEach(topic => {
        console.log(`Topic ${topic} completed in database: ${!!(softskillsProgress[topic] && softskillsProgress[topic].completed)}`);
      });
      
      const allCompleted = learningTopics.every(topic => 
        softskillsProgress[topic] && softskillsProgress[topic].completed
      );
      
      console.log(`All learning topics completed? ${allCompleted}`);
      
      // Store in localStorage for future checks
      if (allCompleted) {
        localStorage.setItem('softskills_completed', JSON.stringify(learningTopics));
      }
      
      setLearningCompleted(allCompleted);
      
      if (!allCompleted) {
        console.log('Not all learning topics completed, redirecting to learning page');
        navigate('/softskills/learning/parts-of-speech');
        return;
      }
      
      await loadCompletedPassages();
      setLoading(false);
    } catch (error) {
      console.error('Error checking learning completion:', error);
      setError('Failed to check completion status. Please try again.');
      setLoading(false);
    }
  };

  const initializeSpeechRecognition = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      
      if ('speechGrammarList' in window || 'webkitSpeechGrammarList' in window) {
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammar = '#JSGF V1.0;';
        const speechGrammarList = new SpeechGrammarList();
        speechGrammarList.addFromString(grammar, 1);
        recognitionRef.current.grammars = speechGrammarList;
      }
      
      let finalTranscriptBuffer = '';
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
          finalTranscriptBuffer += ' ' + finalTranscriptSegment;
          setTranscript(finalTranscriptBuffer.trim());
        } else if (interimTranscript) {
          setTranscript(finalTranscriptBuffer + ' ' + interimTranscript);
        }
      };
      
      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start();
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          stopRecording();
        }
      };
    } else {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }
  };

  const loadCompletedPassages = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const completed = (trainingProgress.reading || []).map(result => result.passageId);
      setCompletedPassages(completed);
    } catch (error) {
      console.error('Error loading completed passages:', error);
    }
  };

  const calculateCompletionPercentage = () => {
    return (completedPassages.length / passages.length) * 100;
  };

  const isPassageCompleted = (passageId) => completedPassages.includes(passageId);

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

  const loadAttemptHistory = async (passageId) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const history = (trainingProgress.reading || []).filter(result => result.passageId === passageId);
      setAttemptHistory(history);
    } catch (error) {
      console.error('Error loading attempt history:', error);
    }
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
    const cleanOriginal = selectedPassage.text.toLowerCase().replace(/[^\w\s.,!?;]/g, "");
    const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s.,!?;]/g, "");
    const originalWords = cleanOriginal.split(/\s+/);
    const transcriptWords = cleanTranscript.split(/\s+/);
    let metrics = {
      contentAccuracy: { correctWords: 0, totalWords: originalWords.length, misspelledWords: [], score: 0 },
      speechPatterns: { pausesAtPunctuation: { detected: 0, expected: 0, score: 0 },
                         speaking: { duration: (Date.now() - recordingStartTime) / 1000, expectedDuration: originalWords.length * 0.5, score: 0 },
                         intonation: { score: 2 } },
      attemptScore: 3
    };
    for (let i = 0; i < Math.min(originalWords.length, transcriptWords.length); i++) {
      const orig = originalWords[i].replace(/[.,!?;]/g, "");
      const trans = transcriptWords[i].replace(/[.,!?;]/g, "");
      if (orig === trans) {
        metrics.contentAccuracy.correctWords++;
      } else {
        if (calculateLevenshteinDistance(orig, trans) <= 2) {
          metrics.contentAccuracy.correctWords += 0.5;
          metrics.contentAccuracy.misspelledWords.push({ original: orig, transcribed: trans, position: i });
        } else {
          metrics.contentAccuracy.misspelledWords.push({ original: orig, transcribed: trans, position: i });
        }
      }
    }
    const accuracyPercentage = metrics.contentAccuracy.correctWords / metrics.contentAccuracy.totalWords;
    metrics.contentAccuracy.score = Math.min(5, Math.round(accuracyPercentage * 5));
    const punctuationMatches = selectedPassage.text.match(/[.,!?;]/g);
    metrics.speechPatterns.pausesAtPunctuation.expected = punctuationMatches ? punctuationMatches.length : 0;
    metrics.speechPatterns.pausesAtPunctuation.detected = Math.floor(metrics.speechPatterns.pausesAtPunctuation.expected * 0.5);
    const pausePercentage = metrics.speechPatterns.pausesAtPunctuation.expected > 0 ?
      metrics.speechPatterns.pausesAtPunctuation.detected / metrics.speechPatterns.pausesAtPunctuation.expected : 0;
    metrics.speechPatterns.pausesAtPunctuation.score = Math.min(2, Math.round(pausePercentage * 2));
    const durationRatio = metrics.speechPatterns.speaking.duration / metrics.speechPatterns.speaking.expectedDuration;
    if (durationRatio >= 0.8 && durationRatio <= 1.2) {
      metrics.speechPatterns.speaking.score = 1;
    } else if (durationRatio >= 0.6 && durationRatio <= 1.4) {
      metrics.speechPatterns.speaking.score = 0.5;
    } else {
      metrics.speechPatterns.speaking.score = 0;
    }
    const totalScore = metrics.attemptScore + metrics.contentAccuracy.score +
      metrics.speechPatterns.pausesAtPunctuation.score + metrics.speechPatterns.intonation.score +
      metrics.speechPatterns.speaking.score;
    const percentageScore = Math.round((totalScore / 10) * 100);
    const scoreData = { metrics, totalScore, percentageScore };
    setDetailedScore(scoreData);
    setAccuracy(percentageScore);
    if (percentageScore >= 90) {
      setFeedback("Excellent! Your reading is very accurate and clear.");
    } else if (percentageScore >= 70) {
      setFeedback("Good job! There's some room for improvement in your reading accuracy.");
    } else if (percentageScore >= 50) {
      setFeedback("You're making progress. Try to read more slowly and clearly for better results.");
    } else {
      setFeedback("Keep practicing! Try reading more slowly and focus on pronunciation.");
    }
    if (!isPassageCompleted(selectedPassage.id) && percentageScore >= 10) {
      saveAttempt(scoreData);
    } else {
      saveAttemptToHistory(scoreData);
    }
  };

  const calculateLevenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const saveAttempt = async (scoreData) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setFeedback('User not logged in');
        return;
      }
      const newAttempt = {
        exerciseId: selectedPassage.id,
        title: selectedPassage.title,
        accuracy: scoreData.percentageScore,
        transcript: transcript,
        metrics: scoreData.metrics
      };
      await progressService.saveTrainingAttempt(userId, 'reading', newAttempt);
      setCompletedPassages([...completedPassages, selectedPassage.id]);
      setAttemptHistory([...attemptHistory, { ...newAttempt, date: new Date().toISOString() }]);
    } catch (error) {
      console.error('Error saving attempt:', error);
      setFeedback('Failed to save attempt.');
    }
  };

  const saveAttemptToHistory = async (scoreData) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setFeedback('User not logged in');
        return;
      }
      const newAttempt = {
        exerciseId: selectedPassage.id,
        title: selectedPassage.title,
        accuracy: scoreData.percentageScore,
        transcript: transcript,
        metrics: scoreData.metrics,
        date: new Date().toISOString()
      };
      await progressService.saveTrainingAttempt(userId, 'reading', newAttempt);
      setAttemptHistory([...attemptHistory, newAttempt]);
      setCompletedPassages([...completedPassages, selectedPassage.id]);
    } catch (error) {
      console.error('Error saving attempt to history:', error);
      setFeedback('Failed to save attempt to history.');
    }
  };

  const handleBackToList = () => {
    setSelectedPassage(null);
    setTranscript('');
    setAccuracy(null);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="training-container">
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading reading exercises...</p>
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
            <h1>Reading Training</h1>
            <p className="training-description">
              Improve your reading skills by practicing with these passages.
              Select a passage and read it aloud to improve your pronunciation and fluency.
            </p>
            
            <div className="training-progress">
              <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />
              
              {completedPassages.length >= Math.ceil(passages.length * 0.5) ? (
                <div className="progress-message success">
                  <span className="checkmark">✓</span>
                  Congratulations! You have completed the Reading module!
                </div>
              ) : (
                <div className="progress-message">
                  Complete {Math.ceil(passages.length * 0.5) - completedPassages.length} more passage(s) to complete this module.
                </div>
              )}
            </div>
          </div>
          
          {selectedPassage ? (
            <div className="passage-practice">
              <div className="passage-header">
                <h2>{selectedPassage.title}</h2>
                <button 
                  className="back-button" 
                  onClick={handleBackToList}
                  disabled={isRecording}
                >
                  ← Back to passages
                </button>
              </div>
              
              <div className="passage-content">
                <div className="passage-text-container">
                  <h3>Reading Passage:</h3>
                  <div className="passage-text">
                    <p>{selectedPassage.text}</p>
                  </div>
                </div>
                
                <div className="reading-controls">
                  <div className="control-buttons">
                    <button 
                      className={`start-button ${isRecording ? 'recording' : ''}`}
                      onClick={startRecording} 
                      disabled={isRecording}
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
                      <p>Recording in progress... Speak clearly</p>
                    </div>
                  )}
                </div>
                
                {transcript && !isRecording && (
                  <div className="transcript-container">
                    <h3>Your Reading:</h3>
                    <p className="transcript-text">{transcript}</p>
                    <div className="word-count">
                      Word count: {transcript.split(/\s+/).filter(w => w.trim().length > 0).length}
                    </div>
                  </div>
                )}
                
                {accuracy !== null && (
                  <div className="results-container">
                    <div className="accuracy-container">
                      <h3>Reading Accuracy: {accuracy}%</h3>
                      <div className="accuracy-meter">
                        <div 
                          className="accuracy-bar" 
                          style={{ 
                            width: `${accuracy}%`,
                            backgroundColor: accuracy >= 80 ? '#4caf50' : 
                                            accuracy >= 60 ? '#ff9800' : '#f44336'
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {feedback && (
                      <div className="feedback-container">
                        <h3>Feedback</h3>
                        <p className="feedback-text">{feedback}</p>
                      </div>
                    )}
                    
                    {detailedScore && (
                      <ScoreBreakdown scoreData={detailedScore} type="reading" />
                    )}
                    
                    {accuracy >= 60 && !isPassageCompleted(selectedPassage.id) && (
                      <div className="completion-notification">
                        <span className="checkmark">✓</span>
                        Congratulations! This passage has been marked as completed.
                      </div>
                    )}
                  </div>
                )}
                
                {attemptHistory.length > 0 && (
                  <div className="history-section">
                    <h3>Previous Attempts</h3>
                    <AttemptHistory attempts={attemptHistory} exerciseType="reading" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="passage-selection">
              <h2>Select a Passage</h2>
              <div className="cards-grid">
                {passages.map(passage => (
                  <div 
                    key={passage.id} 
                    className={`training-card ${isPassageCompleted(passage.id) ? 'completed' : ''}`}
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
                      <span className="card-level">Level {passage.level || 'Beginner'}</span>
                      {isPassageCompleted(passage.id) && (
                        <span className="card-completed">Completed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReadingTraining;