import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import readingPassages from '../../training/readingPassages.json';
import ProgressBar from '../common/ProgressBar';
import ScoreBreakdown, { TranscriptComparison } from '../common/ScoreBreakdown';
import AttemptHistory from '../common/AttemptHistory';
import useGeminiAnalysis from '../../hooks/useGeminiAnalysis';
import AIAnalysis from '../common/AIAnalysis';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import './TrainingStyles.css';

const ReadingTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const transcriptBufferRef = useRef('');
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
      
      // No local variable - use the ref instead
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
          transcriptBufferRef.current += ' ' + finalTranscriptSegment;
          setTranscript(transcriptBufferRef.current.trim());
        } else if (interimTranscript) {
          setTranscript(transcriptBufferRef.current + ' ' + interimTranscript);
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

  // Add localStorage caching for completed passages
  const loadCompletedPassages = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      
      // First check localStorage for cached completed passages
      const cachedPassages = localStorage.getItem('completed_reading_passages');
      if (cachedPassages) {
        setCompletedPassages(JSON.parse(cachedPassages));
      }
      
      // Then get from server anyway to ensure up-to-date
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const completed = (trainingProgress.reading || [])
        .map(result => result.passageId || result.exerciseId) // Check both field names
        .filter(id => id) // Filter out any undefined values
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      
      console.log('Completed passages from DB:', completed);
      
      // Update state and cache
      setCompletedPassages(completed);
      localStorage.setItem('completed_reading_passages', JSON.stringify(completed));
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
    transcriptBufferRef.current = ''; // Reset the buffer when selecting a new passage
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
      transcriptBufferRef.current = ''; // Reset buffer when starting a new recording
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

  // Enhanced calculateDetailedScore function with sophisticated metrics
  const calculateDetailedScore = async () => {
    if (!selectedPassage || !transcript) {
      return;
    }
    
    // Calculate metrics with enhanced validation
    const metrics = calculateEnhancedMetrics(selectedPassage.text, transcript, recordingStartTime);
    
    // Generate feedback based on metrics
    const feedback = generateDetailedFeedback(metrics);
    
    // Calculate overall score
    const totalScore = calculateOverallScore(metrics);
    const percentageScore = Math.round((totalScore / 100) * 100);
    
    // Prepare score data
    const scoreData = { 
      metrics, 
      totalScore, 
      percentageScore,
      feedback 
    };
    
    // Update state with new data
    setDetailedScore(scoreData);
    setAccuracy(percentageScore);
    setFeedback(feedback.summary);
    
    // Save attempt if it's first-time completion with minimum score
    if (!isPassageCompleted(selectedPassage.id) && percentageScore >= 10) {
      saveAttempt(scoreData);
    } else {
      saveAttemptToHistory(scoreData);
    }
  };

  /**
   * Calculates enhanced metrics for reading validation
   * Implements WER, CER, WPM, pauses analysis, and more
   */
  const calculateEnhancedMetrics = (originalText, userTranscript, startTime) => {
    // Get timing information
    const recordingDuration = (Date.now() - startTime) / 1000; // seconds
    
    // Clean and normalize texts for comparison
    const cleanOriginal = originalText.toLowerCase().replace(/[^\w\s.,!?;]/g, "");
    const cleanTranscript = userTranscript.toLowerCase().replace(/[^\w\s.,!?;]/g, "");
    
    // Split into words and characters for analysis
    const originalWords = cleanOriginal.split(/\s+/);
    const transcriptWords = cleanTranscript.split(/\s+/);
    const originalChars = cleanOriginal.replace(/\s+/g, "").split("");
    const transcriptChars = cleanTranscript.replace(/\s+/g, "").split("");
    
    // Initialize metrics structure
    let metrics = {
      // 1. Accuracy Metrics
      accuracy: {
        wer: 0,                  // Word Error Rate
        cer: 0,                  // Character Error Rate
        correctWords: 0,         // Number of correctly spoken words
        totalWords: originalWords.length,
        correctChars: 0,         // Number of correctly spoken characters
        totalChars: originalChars.length,
        misspelledWords: [],     // Words that were mispronounced
        levenshteinDistance: 0,  // Edit distance between texts
        bleuScore: 0,            // BLEU score for n-gram similarity
        score: 0                 // Overall accuracy score (0-30)
      },
      
      // 2. Fluency Metrics
      fluency: {
        wpm: 0,                  // Words per minute
        idealWpmRange: {min: 120, max: 150}, // Ideal range
        pausesCount: 0,          // Number of detected pauses
        expectedPauses: 0,       // Expected pauses (at punctuation)
        fillerWords: 0,          // Detected filler words (um, uh)
        score: 0                 // Overall fluency score (0-30)
      },
      
      // 3. Pronunciation Metrics
      pronunciation: {
        phonemeErrorRate: 0,     // Simplified phoneme error detection
        difficultWords: [],      // Words likely mispronounced based on common errors
        intonationScore: 0,      // Estimated intonation quality
        score: 0                 // Overall pronunciation score (0-20)
      },
      
      // 4. Completeness Metrics
      completeness: {
        coverageRatio: 0,        // Percentage of passage covered
        skippedWords: [],        // Words skipped during reading
        extraWords: [],          // Words added not in original
        score: 0                 // Overall completeness score (0-10)
      },
      
      // 5. Prosody & Emotion
      prosody: {
        variationScore: 0,       // Estimated pitch variation
        consistencyScore: 0,     // Volume consistency (simplified estimate)
        emotionAlignment: 0,     // Alignment with expected emotion
        score: 0                 // Overall prosody score (0-10)
      },
      
      // Raw data for calculations
      rawData: {
        recordingDuration: recordingDuration,
        expectedDuration: originalWords.length * 0.5, // Rough estimate
      }
    };
    
    // 1. Calculate Accuracy Metrics
    
    // Word accuracy calculation
    const wordMatchResults = calculateWordMatches(originalWords, transcriptWords);
    metrics.accuracy.correctWords = wordMatchResults.correctCount;
    metrics.accuracy.misspelledWords = wordMatchResults.misspelledWords;
    
    // WER calculation using Levenshtein for words
    const { distance, operations } = calculateLevenshteinWithOperations(originalWords, transcriptWords);
    metrics.accuracy.levenshteinDistance = distance;
    metrics.accuracy.wer = distance / originalWords.length;
    
    // Extract operations for detailed feedback
    const substitutions = operations.filter(op => op.type === 'substitution');
    const insertions = operations.filter(op => op.type === 'insertion');
    const deletions = operations.filter(op => op.type === 'deletion');
    
    // Character Error Rate
    const charDistance = calculateLevenshteinDistance(
      cleanOriginal.replace(/\s+/g, ""), 
      cleanTranscript.replace(/\s+/g, "")
    );
    metrics.accuracy.cer = charDistance / originalChars.length;
    metrics.accuracy.correctChars = originalChars.length - charDistance;
    
    // Calculate BLEU score (simplified)
    metrics.accuracy.bleuScore = calculateSimplifiedBleu(cleanOriginal, cleanTranscript);
    
    // Overall accuracy score (0-30)
    const wordAccuracyPercent = metrics.accuracy.correctWords / metrics.accuracy.totalWords;
    const cerWeight = 1 - metrics.accuracy.cer;
    metrics.accuracy.score = Math.round((wordAccuracyPercent * 0.7 + cerWeight * 0.3) * 30);
    
    // 2. Calculate Fluency Metrics
    
    // Words per minute
    const minutes = recordingDuration / 60;
    metrics.fluency.wpm = Math.round(transcriptWords.length / minutes);
    
    // Pause detection (based on punctuation)
    const punctuationMatches = originalText.match(/[.,!?;]/g);
    metrics.fluency.expectedPauses = punctuationMatches ? punctuationMatches.length : 0;
    
    // Estimate actual pauses based on transcript patterns
    // This is a simplified approximation since we don't have actual audio analysis
    const pauseEstimate = transcriptWords.length / 10; // Rough estimate
    metrics.fluency.pausesCount = Math.min(
      metrics.fluency.expectedPauses,
      Math.floor(pauseEstimate)
    );
    
    // Detect potential filler words
    const fillerWordRegex = /\b(um|uh|er|like|you know|hmm)\b/gi;
    const fillerMatches = userTranscript.match(fillerWordRegex) || [];
    metrics.fluency.fillerWords = fillerMatches.length;
    
    // Overall fluency score (0-30)
    const wpmScore = calculateWpmScore(metrics.fluency.wpm, metrics.fluency.idealWpmRange);
    const pauseScore = metrics.fluency.pausesCount / Math.max(1, metrics.fluency.expectedPauses);
    const fillerPenalty = Math.min(10, metrics.fluency.fillerWords) / 10;
    
    metrics.fluency.score = Math.round(
      (wpmScore * 0.5 + pauseScore * 0.3 + (1 - fillerPenalty) * 0.2) * 30
    );
    
    // 3. Calculate Pronunciation Metrics (simplified estimation)
    
    // Identify likely difficult words (longer words often have pronunciation issues)
    const difficultWords = originalWords.filter(word => 
      word.length > 7 || /[^a-zA-Z]/.test(word)
    );
    
    // Check if these difficult words appear in misspelled words
    metrics.pronunciation.difficultWords = difficultWords.filter(word =>
      metrics.accuracy.misspelledWords.some(misspelled => 
        misspelled.original && misspelled.original.toLowerCase() === word.toLowerCase()
      )
    );
    
    // Simplified phoneme error rate (since we don't have actual phoneme analysis)
    metrics.pronunciation.phonemeErrorRate = 
      metrics.pronunciation.difficultWords.length / Math.max(1, difficultWords.length);
    
    // Intonation score - simplified estimate since we don't have audio analysis
    // Assume intonation correlates with pauses at punctuation
    metrics.pronunciation.intonationScore = pauseScore * 10;
    
    // Overall pronunciation score (0-20)
    const difficultyScore = 1 - metrics.pronunciation.phonemeErrorRate;
    metrics.pronunciation.score = Math.round(
      (difficultyScore * 0.7 + (metrics.pronunciation.intonationScore / 10) * 0.3) * 20
    );
    
    // 4. Calculate Completeness Metrics
    
    // Coverage ratio
    metrics.completeness.coverageRatio = transcriptWords.length / originalWords.length;
    
    // Identify skipped words
    metrics.completeness.skippedWords = findSkippedWords(originalWords, transcriptWords);
    
    // Identify extra words
    metrics.completeness.extraWords = findExtraWords(originalWords, transcriptWords);
    
    // Overall completeness score (0-10)
    const coverageScore = Math.min(1, metrics.completeness.coverageRatio);
    const skippedPenalty = Math.min(1, metrics.completeness.skippedWords.length / 10);
    const extraPenalty = Math.min(1, metrics.completeness.extraWords.length / 10);
    
    metrics.completeness.score = Math.round(
      (coverageScore * 0.6 + (1 - skippedPenalty) * 0.3 + (1 - extraPenalty) * 0.1) * 10
    );
    
    // 5. Calculate Prosody & Emotion Metrics (simplified without audio)
    
    // Since we don't have actual audio analysis, make some simplifying assumptions
    // based on accuracy and fluency
    metrics.prosody.variationScore = Math.min(10, Math.round(metrics.fluency.score / 3));
    metrics.prosody.consistencyScore = Math.min(5, Math.round(metrics.accuracy.score / 6));
    metrics.prosody.emotionAlignment = 5; // Neutral default without audio
    
    // Overall prosody score (0-10)
    metrics.prosody.score = Math.round(
      (metrics.prosody.variationScore / 10) * 0.5 +
      (metrics.prosody.consistencyScore / 5) * 0.3 +
      (metrics.prosody.emotionAlignment / 10) * 0.2
    ) * 10;
    
    return metrics;
  };

  /**
   * Calculate standard Levenshtein distance between two strings
   */
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
    
    // Fill in the matrix
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

  /**
   * Enhanced Levenshtein that also returns the operations performed
   */
  const calculateLevenshteinWithOperations = (a, b) => {
    if (!Array.isArray(a)) {
      a = a.split(/\s+/);
    }
    if (!Array.isArray(b)) {
      b = b.split(/\s+/);
    }
    
    const matrix = [];
    const operations = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill in the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          const substitutionCost = matrix[i - 1][j - 1] + 1;
          const insertionCost = matrix[i][j - 1] + 1;
          const deletionCost = matrix[i - 1][j] + 1;
          
          matrix[i][j] = Math.min(substitutionCost, insertionCost, deletionCost);
          
          // Record operation
          if (matrix[i][j] === substitutionCost) {
            operations.push({
              type: 'substitution',
              expected: a[j - 1],
              actual: b[i - 1],
              position: j - 1
            });
          } else if (matrix[i][j] === insertionCost) {
            operations.push({
              type: 'insertion',
              actual: b[i - 1],
              position: j - 1
            });
          } else if (matrix[i][j] === deletionCost) {
            operations.push({
              type: 'deletion',
              expected: a[j - 1],
              position: j - 1
            });
          }
        }
      }
    }
    
    // Deduplicate operations by position (simplified approach)
    const uniqueOperations = [];
    const positions = new Set();
    
    operations.forEach(op => {
      const posKey = `${op.type}-${op.position}`;
      if (!positions.has(posKey)) {
        positions.add(posKey);
        uniqueOperations.push(op);
      }
    });
    
    return {
      distance: matrix[b.length][a.length],
      operations: uniqueOperations
    };
  };

  /**
   * Calculate word matches between two arrays
   */
  const calculateWordMatches = (originalWords, transcriptWords) => {
    let correctCount = 0;
    const misspelledWords = [];
    
    // Map to track which words have been matched
    const matchedIndices = new Set();
    
    // First pass: exact matches
    for (let i = 0; i < Math.min(originalWords.length, transcriptWords.length); i++) {
      const orig = originalWords[i].replace(/[.,!?;]/g, "").toLowerCase();
      const trans = transcriptWords[i].replace(/[.,!?;]/g, "").toLowerCase();
      
      if (orig === trans) {
        correctCount++;
        matchedIndices.add(i);
      } else {
        // Check for near matches using Levenshtein
        if (calculateLevenshteinDistance(orig, trans) <= 2) {
          correctCount += 0.5;
          misspelledWords.push({ 
            original: orig, 
            transcribed: trans, 
            position: i,
            nearMatch: true
          });
        } else {
          misspelledWords.push({ 
            original: orig, 
            transcribed: trans, 
            position: i,
            nearMatch: false
          });
        }
      }
    }
    
    // Add remaining missing words if transcript is shorter
    for (let i = transcriptWords.length; i < originalWords.length; i++) {
      misspelledWords.push({ 
        original: originalWords[i].replace(/[.,!?;]/g, ""), 
        transcribed: "", 
        position: i,
        missing: true
      });
    }
    
    return { correctCount, misspelledWords };
  };

  /**
   * Calculate simplified BLEU score
   */
  const calculateSimplifiedBleu = (reference, candidate) => {
    // This is a simplified BLEU score calculation
    // In a real implementation, you'd use n-grams and more sophisticated methods
    
    const refWords = reference.split(/\s+/);
    const candWords = candidate.split(/\s+/);
    
    let matches = 0;
    for (const word of candWords) {
      if (refWords.includes(word)) {
        matches++;
      }
    }
    
    // Simple precision
    const precision = matches / Math.max(1, candWords.length);
    
    // Brevity penalty
    const brevityPenalty = Math.exp(1 - (refWords.length / Math.max(1, candWords.length)));
    
    return Math.min(1, precision * brevityPenalty);
  };

  /**
   * Calculate WPM score based on how close to ideal range
   */
  const calculateWpmScore = (wpm, idealRange) => {
    const { min, max } = idealRange;
    
    if (wpm >= min && wpm <= max) {
      return 1; // Perfect score if within range
    } else if (wpm < min) {
      // Too slow - penalize based on how far below min
      return Math.max(0, 1 - (min - wpm) / min);
    } else {
      // Too fast - penalize based on how far above max
      return Math.max(0, 1 - (wpm - max) / max);
    }
  };

  /**
   * Find words in original that are missing from transcript
   */
  const findSkippedWords = (originalWords, transcriptWords) => {
    const skipped = [];
    
    // Simple approach: check for words that appear in original but not in transcript
    // This is a simplified approach and doesn't account for reordering
    
    const transcriptSet = new Set(transcriptWords.map(w => w.toLowerCase().replace(/[.,!?;]/g, "")));
    
    originalWords.forEach((word, index) => {
      const cleaned = word.toLowerCase().replace(/[.,!?;]/g, "");
      if (!transcriptSet.has(cleaned) && cleaned.length > 2) { // Ignore short words
        skipped.push({ word: cleaned, position: index });
      }
    });
    
    return skipped;
  };

  /**
   * Find words in transcript that don't appear in original
   */
  const findExtraWords = (originalWords, transcriptWords) => {
    const extra = [];
    
    // Simple approach: check for words that appear in transcript but not in original
    
    const originalSet = new Set(originalWords.map(w => w.toLowerCase().replace(/[.,!?;]/g, "")));
    
    transcriptWords.forEach((word, index) => {
      const cleaned = word.toLowerCase().replace(/[.,!?;]/g, "");
      if (!originalSet.has(cleaned) && cleaned.length > 2) { // Ignore short words
        extra.push({ word: cleaned, position: index });
      }
    });
    
    return extra;
  };

  /**
   * Generate detailed feedback based on metrics
   */
  const generateDetailedFeedback = (metrics) => {
    const feedback = {
      summary: "",
      accuracy: [],
      fluency: [],
      pronunciation: [],
      completeness: [],
      prosody: [],
      strengths: [],
      improvements: []
    };
    
    // Overall summary based on total score
    const totalScore = calculateOverallScore(metrics);
    if (totalScore >= 90) {
      feedback.summary = "Excellent! Your reading is very accurate, clear, and well-paced.";
    } else if (totalScore >= 80) {
      feedback.summary = "Very good reading! You have strong skills with just a few areas to improve.";
    } else if (totalScore >= 70) {
      feedback.summary = "Good job! Your reading is mostly accurate with some areas for improvement.";
    } else if (totalScore >= 50) {
      feedback.summary = "You're making good progress. Focus on improving accuracy and fluency.";
    } else {
      feedback.summary = "Keep practicing! Try reading more slowly and focus on pronunciation.";
    }
    
    // Accuracy feedback
    if (metrics.accuracy.score >= 25) {
      feedback.strengths.push("Strong word accuracy and pronunciation");
    } else if (metrics.accuracy.wer > 0.3) {
      feedback.accuracy.push("Work on reading the exact words from the passage. You missed or changed several words.");
      
      if (metrics.accuracy.misspelledWords.length > 0) {
        const examples = metrics.accuracy.misspelledWords
          .slice(0, 3)
          .map(w => w.original)
          .join(", ");
        feedback.accuracy.push(`Pay careful attention to words like: ${examples}`);
      }
    }
    
    // Fluency feedback
    const { wpm, idealWpmRange } = metrics.fluency;
    if (metrics.fluency.score >= 25) {
      feedback.strengths.push("Excellent reading pace and fluency");
    } else {
      if (wpm < idealWpmRange.min) {
        feedback.fluency.push(`Your reading pace (${wpm} words per minute) is slower than the ideal range (${idealWpmRange.min}-${idealWpmRange.max} WPM). Try to increase your speed while maintaining accuracy.`);
      } else if (wpm > idealWpmRange.max) {
        feedback.fluency.push(`Your reading pace (${wpm} words per minute) is faster than the ideal range (${idealWpmRange.min}-${idealWpmRange.max} WPM). Try to slow down for better clarity.`);
      }
      
      if (metrics.fluency.fillerWords > 0) {
        feedback.fluency.push(`Reduce filler words like "um" and "uh" for smoother reading.`);
      }
      
      if (metrics.fluency.pausesCount < metrics.fluency.expectedPauses * 0.7) {
        feedback.fluency.push("Pay attention to punctuation and pause appropriately at commas and periods.");
      }
    }
    
    // Pronunciation feedback
    if (metrics.pronunciation.score >= 15) {
      feedback.strengths.push("Good pronunciation of challenging words");
    } else if (metrics.pronunciation.difficultWords.length > 0) {
      const examples = metrics.pronunciation.difficultWords
        .slice(0, 3)
        .join(", ");
      feedback.pronunciation.push(`Practice pronouncing challenging words like: ${examples}`);
    }
    
    // Completeness feedback
    if (metrics.completeness.coverageRatio < 0.9) {
      feedback.completeness.push("You missed some parts of the passage. Make sure to read the entire text.");
      
      if (metrics.completeness.skippedWords.length > 0) {
        const examples = metrics.completeness.skippedWords
          .slice(0, 3)
          .map(w => w.word)
          .join(", ");
        feedback.completeness.push(`Skipped words include: ${examples}`);
      }
    } else if (metrics.completeness.score >= 8) {
      feedback.strengths.push("Excellent coverage of the passage");
    }
    
    // Prosody feedback
    if (metrics.prosody.score < 7) {
      feedback.prosody.push("Try to read with more natural expression and intonation. Avoid monotone reading.");
    } else {
      feedback.strengths.push("Good expression and tone variation");
    }
    
    // Compile improvements
    const allImprovements = [
      ...feedback.accuracy,
      ...feedback.fluency,
      ...feedback.pronunciation,
      ...feedback.completeness,
      ...feedback.prosody
    ];
    
    // Take top 3 most important improvements
    feedback.improvements = allImprovements.slice(0, 3);
    
    return feedback;
  };

  /**
   * Calculate overall score from all metrics
   */
  const calculateOverallScore = (metrics) => {
    // Weight each category appropriately
    return Math.round(
      (metrics.accuracy.score / 30) * 35 +      // 35% weight
      (metrics.fluency.score / 30) * 30 +       // 30% weight
      (metrics.pronunciation.score / 20) * 15 +  // 15% weight
      (metrics.completeness.score / 10) * 10 +   // 10% weight
      (metrics.prosody.score / 10) * 10          // 10% weight
    );
  };

  const saveAttempt = async (scoreData) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setFeedback('User not logged in');
        return;
      }
      const newAttempt = {
        passageId: selectedPassage.id,
        title: selectedPassage.title,
        accuracy: scoreData.percentageScore,
        transcript: transcript,
        metrics: scoreData.metrics,
        feedback: scoreData.feedback
      };
      await progressService.saveTrainingAttempt(userId, 'reading', newAttempt);
      
      // Only add to completedPassages if not already there
      if (!completedPassages.includes(selectedPassage.id)) {
        const updatedCompletedPassages = [...completedPassages, selectedPassage.id];
        setCompletedPassages(updatedCompletedPassages);
        localStorage.setItem('completed_reading_passages', JSON.stringify(updatedCompletedPassages));
      }
      
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
        passageId: selectedPassage.id,
        title: selectedPassage.title,
        accuracy: scoreData.percentageScore,
        transcript: transcript,
        metrics: scoreData.metrics,
        feedback: scoreData.feedback,
        date: new Date().toISOString()
      };
      await progressService.saveTrainingAttempt(userId, 'reading', newAttempt);
      setAttemptHistory([...attemptHistory, newAttempt]);
      
      // Only add to completedPassages if not already there (same check as in saveAttempt)
      if (!completedPassages.includes(selectedPassage.id)) {
        const updatedCompletedPassages = [...completedPassages, selectedPassage.id];
        setCompletedPassages(updatedCompletedPassages);
        localStorage.setItem('completed_reading_passages', JSON.stringify(updatedCompletedPassages));
      }
    } catch (error) {
      console.error('Error saving attempt to history:', error);
      setFeedback('Failed to save attempt to history.');
    }
  };

  const handleBackToList = () => {
    setSelectedPassage(null);
    setTranscript('');
    transcriptBufferRef.current = ''; // Reset buffer when going back to list
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
                
                {/* Add transcript comparison component */}
                {transcript && !isRecording && detailedScore && (
                  <TranscriptComparison 
                    originalText={selectedPassage.text}
                    userTranscript={transcript}
                    metrics={detailedScore.metrics}
                  />
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