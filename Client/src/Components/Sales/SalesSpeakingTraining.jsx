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
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(null);
  const [bestAttempt, setBestAttempt] = useState(null);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerIntervalRef = useRef(null);

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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
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
      
      let completed = [];
      
      // Check for salesSpeaking data
      if (trainingProgress.salesSpeaking && typeof trainingProgress.salesSpeaking === 'object') {
        // New structure with salesSpeaking field
        completed = Object.keys(trainingProgress.salesSpeaking);
      } else {
        // Fall back to the old structure (speaking array)
        const speakingAttempts = trainingProgress.speaking || [];
        completed = speakingAttempts
          .filter(attempt => attempt.topicId && attempt.topicId.startsWith('sales-'))
          .map(result => result.topicId);
      }
      
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
      
      console.log(`Loading sales speaking attempt history for user ${userId}`);
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      
      let attempts = [];
      let bestAttemptData = null;
      
      // Check for salesSpeaking data
      if (trainingProgress.salesSpeaking && typeof trainingProgress.salesSpeaking === 'object') {
        // New structure with salesSpeaking field
        const salesQuestions = Object.keys(trainingProgress.salesSpeaking);
        
        // Flatten the metrics arrays from each question
        const allAttempts = [];
        let highestScore = 0;
        
        salesQuestions.forEach(questionId => {
          const questionData = trainingProgress.salesSpeaking[questionId];
          if (questionData && questionData.metrics && Array.isArray(questionData.metrics)) {
            questionData.metrics.forEach(metric => {
              const attemptData = {
                topicId: questionId,
                title: questionData.question,
                score: metric.percentage_score,
                transcript: metric.transcript,
                metrics: metric,
                date: metric.timestamp
              };
              
              allAttempts.push(attemptData);
              
              // Check if this is the best attempt
              if (metric.percentage_score > highestScore) {
                highestScore = metric.percentage_score;
                bestAttemptData = attemptData;
              }
            });
          }
        });
        
        attempts = allAttempts;
      } else {
        // Fall back to the old structure (speaking array)
        const speakingAttempts = trainingProgress.speaking || [];
        attempts = speakingAttempts.filter(
          attempt => attempt.topicId && attempt.topicId.startsWith('sales-')
        );
        
        // Find best attempt
        if (attempts.length > 0) {
          bestAttemptData = attempts.reduce((best, current) => 
            (current.score > best.score) ? current : best
          );
        }
      }
      
      setAttemptHistory(attempts);
      setBestAttempt(bestAttemptData);
      
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
    setSelectedAttemptIndex(null);
    textToSpeechService.resetPlayCount();
    setViewMode('question');
    
    // Load attempt history for this specific question
    loadQuestionAttempts(question.id);
  };
  
  const loadQuestionAttempts = async (questionId) => {
    try {
      if (!userId) return;
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      
      // Check for salesSpeaking data
      if (trainingProgress.salesSpeaking && typeof trainingProgress.salesSpeaking === 'object') {
        // New structure with salesSpeaking field
        const questionData = trainingProgress.salesSpeaking[questionId];
        if (questionData && questionData.metrics && Array.isArray(questionData.metrics)) {
          setAttemptHistory(questionData.metrics);
          
          // Find best attempt
          if (questionData.metrics.length > 0) {
            const bestAttempt = questionData.metrics.reduce((best, current) => 
              (current.overall_score > best.overall_score) ? current : best
            );
            setBestAttempt(bestAttempt);
          }
        } else {
          setAttemptHistory([]);
          setBestAttempt(null);
        }
      } else {
        // Fall back to the old structure (speaking array)
        const speakingAttempts = trainingProgress.speaking || [];
        const history = speakingAttempts.filter(result => result.topicId === questionId);
        setAttemptHistory(history);
        setBestAttempt(null);
      }
    } catch (error) {
      console.error('Error loading question attempts:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const TimerDisplay = () => {
    if (!isRecording) return null;
    
    return (
      <div className="timer-display">
        <div className={`timer-value ${timeLeft < 30 ? 'timer-warning' : ''}`}>
          {formatTime(timeLeft)}
        </div>
        <div className="timer-label">
          Time Remaining
        </div>
      </div>
    );
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
      setRecordingStartTime(Date.now());
      
      // Set timer for 2 minutes (120 seconds)
      setTimeLeft(120);
      setTimerActive(true);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current);
            stopRecording(); // Auto-submit when time runs out
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
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
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            setTimerActive(false);
          }
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
      
      // Clear the timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        setTimerActive(false);
      }
      
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
      // Get recording duration in seconds
      const recordingDuration = (Date.now() - recordingStartTime) / 1000;
      
      // Analysis logic for the speaking response
      const words = transcript.split(/\s+/).filter(w => w.trim().length > 0);
      const wordCount = words.length;
      
      // Initialize metrics structure with new 9-point system
      const metrics = {
        // Speaking duration (5 points)
        speaking_duration: {
          duration_seconds: recordingDuration,
          minimum_required: 30, // 30 seconds minimum
          score: 0 // Will be set to 5 if spoke for minimum 30 seconds
        },
        
        // Attempt participation (1 point)
        attempt: {
          made: true,
          score: 1 // Always 1 for attempting
        },
        
        // Pronunciation quality (1 point)
        pronunciation: {
          mispronounced_words: [],
          mispronunciation_count: 0,
          score: 0 // Will be calculated
        },
        
        // Sentence framing (1 point)
        sentence_framing: {
          quality_score: 0,
          score: 0 // Will be calculated
        },
        
        // Punctuation usage (1 point)
        punctuation: {
          punctuation_count: 0,
          expected_count: 0,
          score: 0 // Will be calculated
        },
        
        // Relevance and key points (for feedback)
        relevance: {
          relevanceScore: 0,
          keyWords: []
        },
        
        // Raw data for calculations
        raw_data: {
          recording_duration: recordingDuration,
          expected_duration: 120, // 2 minutes in seconds
          transcript: transcript,
          question_text: selectedQuestion.question
        },
        
        // Overall score (out of 9)
        overall_score: 0,
        percentage_score: 0
      };
      
      // 1. Score speaking duration (5 points)
      if (recordingDuration >= 30) {
        metrics.speaking_duration.score = 5;
      } else {
        // Partial credit for shorter durations
        metrics.speaking_duration.score = Math.round((recordingDuration / 30) * 5);
      }
      
      // 2. Attempt is already scored (1 point)
      
      // 3. Score pronunciation (1 point)
      // Simplified analysis - count complex words pronounced correctly
      const complexWords = words.filter(word => word.length > 6);
      const complexWordRatio = complexWords.length / Math.max(1, wordCount);
      const pronunciationScore = Math.min(1, complexWordRatio * 3); // Scale up for better scoring
      metrics.pronunciation.score = pronunciationScore;
      
      // 4. Score sentence framing (1 point)
      // Look for complete sentences with subject-verb structure
      const sentenceCount = (transcript.match(/[.!?]+/g) || []).length;
      const estimatedSentenceCount = Math.max(1, Math.floor(wordCount / 10)); // Estimate 10 words per sentence
      
      const sentenceFramingScore = sentenceCount > 0 ? 
        Math.min(1, sentenceCount / estimatedSentenceCount) : 0.5;
      
      metrics.sentence_framing.quality_score = sentenceCount;
      metrics.sentence_framing.score = sentenceFramingScore;
      
      // 5. Score punctuation (1 point)
      const punctuationCount = (transcript.match(/[.!?,;:]+/g) || []).length;
      const expectedPunctuationCount = Math.max(1, Math.floor(wordCount / 12)); // Expect punctuation every ~12 words
      
      const punctuationScore = punctuationCount > 0 ? 
        Math.min(1, punctuationCount / expectedPunctuationCount) : 0;
      
      metrics.punctuation.punctuation_count = punctuationCount;
      metrics.punctuation.expected_count = expectedPunctuationCount;
      metrics.punctuation.score = punctuationScore;
      
      // Assess relevance for feedback
      const relevanceScore = assessRelevance(selectedQuestion.question, transcript);
      metrics.relevance.relevanceScore = relevanceScore;
      
      // Calculate overall score (out of 9)
      metrics.overall_score = 
        metrics.speaking_duration.score + 
        metrics.attempt.score + 
        metrics.pronunciation.score + 
        metrics.sentence_framing.score + 
        metrics.punctuation.score;
      
      // Convert to percentage (100-point scale)
      metrics.percentage_score = Math.round((metrics.overall_score / 9) * 100);
      
      // Generate feedback based on metrics
      const feedback = generateDetailedFeedback(metrics);
      
      // Create detailed score object for ScoreBreakdown component
      const scoreData = {
        totalScore: metrics.overall_score,
        percentageScore: metrics.percentage_score,
        metrics: metrics,
        feedback: feedback
      };
      
      setDetailedScore(scoreData);
      
      // Feedback object for UI display
      setFeedback({
        score: metrics.percentage_score,
        text: feedback.summary,
        wordCount,
        metrics
      });
      
      // Save attempt
      saveAttempt(selectedQuestion, scoreData);
      
    } catch (error) {
      console.error('Error analyzing response:', error);
      setError('Error analyzing your response. Please try again.');
    }
  };

  // Generate detailed feedback based on metrics
  const generateDetailedFeedback = (metrics) => {
    const feedback = {
      summary: "",
      strengths: [],
      improvements: []
    };
    
    // Overall summary based on total score
    const totalScore = metrics.overall_score;
    if (totalScore >= 8) {
      feedback.summary = "Excellent! Your response was well-structured, clear, and comprehensive.";
    } else if (totalScore >= 6) {
      feedback.summary = "Very good speaking! You have strong skills with just a few areas to improve.";
    } else if (totalScore >= 4.5) {
      feedback.summary = "Good job! Your speaking shows progress with some areas for improvement.";
    } else if (totalScore >= 3) {
      feedback.summary = "You're making progress. Focus on speaking longer and using complete sentences.";
    } else {
      feedback.summary = "Keep practicing! Try to speak for at least 30 seconds using complete sentences.";
    }
    
    // Identify strengths
    if (metrics.speaking_duration.score >= 4) {
      feedback.strengths.push("You spoke for an appropriate length of time");
    }
    
    if (metrics.pronunciation.score >= 0.75) {
      feedback.strengths.push("Good pronunciation of words");
    }
    
    if (metrics.sentence_framing.score >= 0.75) {
      feedback.strengths.push("Well-structured sentences");
    }
    
    if (metrics.punctuation.score >= 0.75) {
      feedback.strengths.push("Good use of pauses and intonation");
    }
    
    if (metrics.relevance.relevanceScore >= 70) {
      feedback.strengths.push("Your response was relevant to the question");
    }
    
    // Identify areas for improvement
    if (metrics.speaking_duration.score < 4) {
      feedback.improvements.push(`Try to speak for at least 30 seconds (you spoke for ${Math.round(metrics.speaking_duration.duration_seconds)} seconds)`);
    }
    
    if (metrics.pronunciation.score < 0.75) {
      feedback.improvements.push("Practice pronouncing longer, more complex words");
    }
    
    if (metrics.sentence_framing.score < 0.75) {
      feedback.improvements.push("Work on forming complete sentences with clear subject-verb structure");
    }
    
    if (metrics.punctuation.score < 0.75) {
      feedback.improvements.push("Use appropriate pauses and varied intonation to indicate punctuation");
    }
    
    if (metrics.relevance.relevanceScore < 60) {
      feedback.improvements.push("Try to make your response more relevant to the question");
    }
    
    return feedback;
  };

  // Simple relevance assessment based on keyword matching
  const assessRelevance = (question, response) => {
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const responseWords = response.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    questionWords.forEach(word => {
      if (responseWords.includes(word)) matchCount++;
    });
    
    return Math.min(100, Math.round((matchCount / Math.max(1, questionWords.length)) * 100));
  };

  const saveAttempt = async (question, scoreData) => {
    try {
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      // Format attempt data for new structure
      const attemptData = {
        timestamp: new Date().toISOString(),
        speaking_duration: scoreData.metrics.speaking_duration.duration_seconds,
        minimum_duration_met: scoreData.metrics.speaking_duration.duration_seconds >= 30,
        attempt_score: scoreData.metrics.attempt.score,
        pronunciation_score: scoreData.metrics.pronunciation.score,
        sentence_framing_score: scoreData.metrics.sentence_framing.score,
        punctuation_score: scoreData.metrics.punctuation.score,
        relevance_score: scoreData.metrics.relevance.relevanceScore,
        overall_score: scoreData.metrics.overall_score,
        percentage_score: scoreData.metrics.percentage_score,
        transcript: transcript,
        feedback: scoreData.feedback
      };
      
      // Create payload with the new structure
      const payload = {
        questionId: question.id,
        question: question.question,
        attemptData: attemptData,
        isFirstCompletion: !completedQuestions.includes(question.id)
      };
      
      // Save using the new structure and specific method
      await progressService.saveSalesSpeakingAttempt(userId, payload);
      
      // Only add to completedQuestions if not already there and score is passing
      if (!completedQuestions.includes(question.id) && scoreData.metrics.overall_score >= 4.5) {
        const updatedCompletedQuestions = [...completedQuestions, question.id];
        setCompletedQuestions(updatedCompletedQuestions);
      }
      
      // Reload attempt history
      await loadQuestionAttempts(question.id);
      
      // Dispatch event to refresh progress in other components
      const progressEvent = new CustomEvent('progressUpdated', {
        detail: { userId, skillType, type: 'salesSpeaking', questionId: question.id }
      });
      window.dispatchEvent(progressEvent);
      
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
      
      // Clear timer if active
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        setTimerActive(false);
      }
    }
    
    textToSpeechService.cancel();
    setIsPlaying(false);
    
    // Reload all attempt history when returning to overview
    loadAttemptHistory();
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
    
    const totalScore = attemptHistory.reduce((sum, attempt) => {
      // Handle both old and new data structure
      const score = attempt.score || attempt.percentage_score || 0;
      return sum + score;
    }, 0);
    
    return Math.round(totalScore / attemptHistory.length);
  };

  // Enhanced score breakdown for the new metrics
  const EnhancedScoreBreakdown = ({ scoreData }) => {
    if (!scoreData || !scoreData.metrics) return null;
    
    const { metrics } = scoreData;
    
    // Helper function for color coding
    const getScoreColor = (score, max) => {
      const ratio = score / max;
      if (ratio >= 0.8) return '#4caf50'; // green
      if (ratio >= 0.5) return '#ff9800'; // orange
      return '#f44336'; // red
    };
    
    return (
      <div className="enhanced-score-breakdown">
        <div className="score-header">
          <h3>Score Breakdown</h3>
          <div className="total-score">
            <div className="score-circle">
              <span className="score-number">{Math.round(scoreData.totalScore)}</span>
              <span className="score-max">/9</span>
            </div>
            <div className="score-percentage">{scoreData.percentageScore}%</div>
          </div>
        </div>
        
        <div className="new-score-categories">
          {/* Speaking Duration - 5 points */}
          <div className="score-category">
            <div className="category-header">
              <h4>Speaking Duration</h4>
              <div className="category-score">
                {metrics.speaking_duration?.score || 0}/5
              </div>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${(metrics.speaking_duration?.score / 5) * 100}%`,
                  backgroundColor: getScoreColor(metrics.speaking_duration?.score || 0, 5)
                }}
              ></div>
            </div>
            <div className="category-details">
              {metrics.speaking_duration?.duration_seconds >= 30 ? (
                <div className="detail-item success">
                  <span className="detail-check">✓</span> Spoke for minimum 30 seconds
                </div>
              ) : (
                <div className="detail-item warning">
                  <span className="detail-x">✗</span> Need to speak for at least 30 seconds
                </div>
              )}
              
              <div className="detail-item">
                <span className="detail-label">Your duration:</span>
                <span className="detail-value">
                  {Math.round(metrics.speaking_duration?.duration_seconds || 0)} seconds
                </span>
              </div>
            </div>
          </div>
          
          {/* Attempt - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Attempt</h4>
              <div className="category-score">
                {metrics.attempt?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${(metrics.attempt?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(metrics.attempt?.score || 0, 1)
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item success">
                <span className="detail-check">✓</span> Attempt completed
              </div>
            </div>
          </div>
          
          {/* Pronunciation - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Pronunciation</h4>
              <div className="category-score">
                {metrics.pronunciation?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${(metrics.pronunciation?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(metrics.pronunciation?.score || 0, 1)
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Pronunciation quality:</span>
                <span className="detail-value">
                  {Math.round((metrics.pronunciation?.score || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Sentence Framing - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Sentence Framing</h4>
              <div className="category-score">
                {metrics.sentence_framing?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${(metrics.sentence_framing?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(metrics.sentence_framing?.score || 0, 1)
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Complete sentences:</span>
                <span className="detail-value">
                  {metrics.sentence_framing?.quality_score || 0}
                </span>
              </div>
            </div>
          </div>
          
          {/* Punctuation - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Punctuation</h4>
              <div className="category-score">
                {metrics.punctuation?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${(metrics.punctuation?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(metrics.punctuation?.score || 0, 1)
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Pauses/intonations:</span>
                <span className="detail-value">
                  {metrics.punctuation?.punctuation_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="additional-metrics">
          <h4>Additional Information</h4>
          <div className="detail-item">
            <span className="detail-label">Word Count:</span>
            <span className="detail-value">{transcript.split(/\s+/).filter(w => w.trim().length > 0).length}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Relevance Score:</span>
            <span className="detail-value">{metrics.relevance?.relevanceScore || 0}%</span>
          </div>
        </div>
        
        {/* Feedback Section */}
        {scoreData.feedback && (
          <div className="enhanced-feedback-section">
            <h4>Feedback</h4>
            <p className="feedback-summary">{scoreData.feedback.summary}</p>
            
            {scoreData.feedback.strengths?.length > 0 && (
              <div className="feedback-strengths">
                <h5>Strengths:</h5>
                <ul>
                  {scoreData.feedback.strengths.map((strength, index) => (
                    <li key={`strength-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {scoreData.feedback.improvements?.length > 0 && (
              <div className="feedback-improvements">
                <h5>Areas for Improvement:</h5>
                <ul>
                  {scoreData.feedback.improvements.map((improvement, index) => (
                    <li key={`improvement-${index}`}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Enhanced attempt history component
  const EnhancedAttemptHistory = () => {
    if (attemptHistory.length === 0) return null;
    
    // Format date for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // Handle selecting an attempt
    const handleAttemptSelect = (index) => {
      setSelectedAttemptIndex(index);
      
      // Update displayed metrics based on the selected attempt
      const selectedAttempt = attemptHistory[index];
      
      // Create compatible score data structure for display
      const compatibleScoreData = {
        metrics: selectedAttempt,
        totalScore: selectedAttempt.overall_score,
        percentageScore: selectedAttempt.percentage_score,
        feedback: selectedAttempt.feedback
      };
      
      setDetailedScore(compatibleScoreData);
      setFeedback({
        score: selectedAttempt.percentage_score,
        text: selectedAttempt.feedback?.summary || '',
        wordCount: selectedAttempt.transcript ? selectedAttempt.transcript.split(/\s+/).filter(w => w.trim().length > 0).length : 0
      });
      setTranscript(selectedAttempt.transcript || '');
    };
    
    return (
      <div className="enhanced-history-section">
        <div className="history-header">
          <h3>Previous Attempts</h3>
          {bestAttempt && (
            <div className="best-attempt-badge">
              Best Score: {bestAttempt.overall_score}/9 ({bestAttempt.percentage_score}%)
            </div>
          )}
        </div>
        
        <div className="attempt-timeline">
          {attemptHistory.map((attempt, index) => (
            <div 
              key={index}
              className={`attempt-item ${selectedAttemptIndex === index ? 'selected' : ''} ${
                bestAttempt && attempt.timestamp === bestAttempt.timestamp ? 'best-attempt' : ''
              }`}
              onClick={() => handleAttemptSelect(index)}
            >
              <div className="attempt-date">
                {attempt.timestamp ? formatDate(attempt.timestamp) : formatDate(attempt.date || new Date())}
              </div>
              <div className="attempt-score">
                <strong>{attempt.overall_score || Math.round((attempt.score || 0) / 100 * 9)}/9</strong>
                <span className="attempt-percentage">
                  ({attempt.percentage_score || attempt.score || 0}%)
                </span>
              </div>
              {attempt.speaking_duration >= 30 || attempt.minimum_duration_met ? (
                <div className="attempt-complete">Min Duration Met</div>
              ) : (
                <div className="attempt-incomplete">Too Short</div>
              )}
              {bestAttempt && (attempt.timestamp === bestAttempt.timestamp || attempt.date === bestAttempt.date) && (
                <div className="best-indicator">Best</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
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
                                  <span className="completion-score">
                                    {attempt ? (attempt.percentage_score || attempt.score || 0) : 0}%
                                  </span>
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
                        // Handle both data structures
                        const questionId = attempt.topicId;
                        const question = questions.find(q => q.id === questionId);
                        const score = attempt.percentage_score || attempt.score || 0;
                        const date = attempt.timestamp || attempt.date || new Date();
                        
                        return (
                          <tr key={index}>
                            <td className="attempt-question">
                              {question ? question.question : attempt.title}
                            </td>
                            <td className="attempt-score" style={{
                              color: score >= 80 ? '#4caf50' : 
                                     score >= 60 ? '#ff9800' : '#f44336'
                            }}>{score}%</td>
                            <td className="attempt-date">{new Date(date).toLocaleDateString()}</td>
                            <td className="attempt-action">
                              <button 
                                className="retry-button"
                                onClick={() => selectQuestion(question || { id: questionId, question: attempt.title })}
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
                    
                    {/* Add timer display */}
                    <TimerDisplay />
                    
                    {isRecording && (
                      <div className="recording-status">
                        <div className="recording-indicator"></div>
                        <p>Recording in progress... Speak clearly for at least 30 seconds.</p>
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
                    
                    {detailedScore && (
                      <EnhancedScoreBreakdown scoreData={detailedScore} />
                    )}
                    
                    {feedback.score >= 60 && !isQuestionCompleted(selectedQuestion.id) && (
                      <div className="completion-notification">
                        <span className="check-icon">✓</span>
                        <span>Question completed successfully!</span>
                      </div>
                    )}
                    
                    <div className="action-buttons">
                      <button className="retry-button" onClick={tryAgain}>
                        Try Again
                      </button>
                      
                      <button className="next-button" onClick={handleBackToOverview}>
                        Back to Questions
                      </button>
                    </div>
                  </div>
                )}
                
                {attemptHistory.length > 0 && (
                  <div className="history-section">
                    <EnhancedAttemptHistory />
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