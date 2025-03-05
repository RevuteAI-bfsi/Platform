import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import listeningExercises from '../../training/listeningExercises.json';
import ProgressBar from '../common/ProgressBar';
import ScoreBreakdown from '../common/ScoreBreakdown';
import AttemptHistory from '../common/AttemptHistory';
import textToSpeechService from '../../services/TextToSpeechService';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import './TrainingStyles.css';

const ListeningTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [exercises, setExercises] = useState([]);
  const [exercisesByLevel, setExercisesByLevel] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [detailedScore, setDetailedScore] = useState(null);
  const [levelScores, setLevelScores] = useState({});
  const [completedExercises, setCompletedExercises] = useState([]);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [readingCompleted, setReadingCompleted] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [maxPlaysReached, setMaxPlaysReached] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [levelResults, setLevelResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);
  
  // View mode to switch between level selection and exercise view
  const [viewMode, setViewMode] = useState('levels');

  const exerciseScoresRef = useRef([]);
  const userId = localStorage.getItem('userId');
  
  // Use consistent skill type detection
  const skillType = determineSkillType(location.pathname);

  // Pre-process exercises on component mount
  useEffect(() => {
    try {
      console.log('Initializing ListeningTraining component...');
      
      // Safely check if listeningExercises is available and valid
      if (!listeningExercises || !Array.isArray(listeningExercises)) {
        console.error('Error: listeningExercises is not a valid array', listeningExercises);
        setError('Failed to load listening exercises data. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Processing listening exercises data...');
      
      // Process exercises into levels
      const allExercises = [];
      const levelGroups = {};
      
      listeningExercises.forEach(levelGroup => {
        const level = levelGroup.level;
        
        if (!levelGroup.exercises || !Array.isArray(levelGroup.exercises)) {
          console.warn(`Level ${level} has invalid exercises data`);
          return;
        }
        
        const exs = levelGroup.exercises.map(exercise => ({ ...exercise, level }));
        levelGroups[level] = exs;
        allExercises.push(...exs);
      });
      
      console.log(`Processed ${allExercises.length} exercises across ${Object.keys(levelGroups).length} levels`);
      
      setExercisesByLevel(levelGroups);
      setExercises(allExercises);
      setContentLoaded(true);
    } catch (err) {
      console.error('Error processing exercises data:', err);
      setError('Failed to process exercises data. Please try again.');
    }
  }, []);

  // Check previous completion and load user progress
  useEffect(() => {
    const checkPreviousCompletion = async () => {
      try {
        setLoading(true);
        
        if (!userId) {
          setError('User not logged in');
          return;
        }
        
        console.log(`Checking previous completion for user ${userId}, skillType ${skillType}`);
        
        // First, check localStorage for completion status (faster)
        const completedTopicsFromStorage = JSON.parse(
          localStorage.getItem(`${skillType}_completed`) || '[]'
        );
        
        // Get the appropriate learning topics for this skill type
        let learningTopics = [];
        if (skillType === 'softskills') {
          learningTopics = ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
        } else if (skillType === 'sales') {
          learningTopics = ['introduction', 'telecalling', 'skills-needed', 'telecalling-module'];
        } else if (skillType === 'product') {
          learningTopics = ['bank-terminologies', 'casa-kyc', 'personal-loans'];
        }
        
        // Check if all required topics are completed in localStorage
        const allCompletedInStorage = learningTopics.every(topic => 
          completedTopicsFromStorage.includes(topic)
        );
        
        console.log(`Learning completion status from localStorage: ${allCompletedInStorage}`);
        
        // If all topics are completed in localStorage, we can skip the API call
        if (allCompletedInStorage) {
          setLearningCompleted(true);
          
          // Continue with loading training progress
          const userProgress = await progressService.getUserProgress(userId);
          const trainingProgress = userProgress.trainingProgress || {};
          
          // Check if reading module is completed
          const readingAttempts = trainingProgress.reading || [];
          const readingCompletionPercentage = (readingAttempts.length / 5) * 100;
          const isReadingModuleCompleted = readingCompletionPercentage >= 50;
          setReadingCompleted(isReadingModuleCompleted);
          
          if (!isReadingModuleCompleted && !location.pathname.includes('/training/listening')) {
            console.log('Reading module not completed, redirecting to reading page');
            navigate(`/${skillType}/training/reading`);
            return;
          }
          
          await loadCompletedData();
          setLoading(false);
          return;
        }
        
        // If not found in localStorage, check the server
        const userProgress = await progressService.getUserProgress(userId);
        const learningProgress = userProgress.learningProgress[skillType] || {};
        
        // Check if all topics are completed in the database
        const allCompleted = learningTopics.every(topic => 
          learningProgress[topic] && learningProgress[topic].completed
        );
        
        console.log(`All ${skillType} learning topics completed? ${allCompleted}`);
        
        // Store in localStorage for future checks
        if (allCompleted) {
          localStorage.setItem(`${skillType}_completed`, JSON.stringify(learningTopics));
        }
        
        setLearningCompleted(allCompleted);
        
        if (!allCompleted) {
          console.log('Not all learning topics completed, redirecting to learning page');
          navigate(`/${skillType}/learning/${learningTopics[0]}`);
          return;
        }
        
        // Check if reading module is completed
        const trainingProgress = userProgress.trainingProgress || {};
        const readingAttempts = trainingProgress.reading || [];
        const readingCompletionPercentage = (readingAttempts.length / 5) * 100;
        const isReadingModuleCompleted = readingCompletionPercentage >= 50;
        setReadingCompleted(isReadingModuleCompleted);
        
        if (!isReadingModuleCompleted && !location.pathname.includes('/training/listening')) {
          console.log('Reading module not completed, redirecting to reading page');
          navigate(`/${skillType}/training/reading`);
          return;
        }
        
        await loadCompletedData();
        setLoading(false);
      } catch (err) {
        console.error('Error checking completion:', err);
        setError('Failed to load progress data. Please try again.');
        setLoading(false);
      }
    };

    if (contentLoaded) {
      checkPreviousCompletion();
      textToSpeechService.resetPlayCount();
    }
    
    return () => {
      textToSpeechService.cancel();
    };
  }, [contentLoaded, navigate, userId, skillType, location.pathname]);

  const loadCompletedData = async () => {
    try {
      if (!userId) return;
      
      console.log('Loading completed exercises data...');
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const listeningAttempts = trainingProgress.listening || [];
      const completed = listeningAttempts.map(result => result.exerciseId);
      
      console.log(`Found ${completed.length} completed listening exercises`);
      
      setCompletedExercises(completed);
      setCompletedLevels(trainingProgress.completedLevels || []);
      setLevelScores(trainingProgress.levelScores || {});
      setAttemptHistory(listeningAttempts);
    } catch (error) {
      console.error('Error loading completed data:', error);
      setError('Failed to load completed data.');
    }
  };

  const calculateCompletionPercentage = () => {
    const totalLevels = Object.keys(exercisesByLevel).length;
    return totalLevels > 0 ? (completedLevels.length / totalLevels) * 100 : 0;
  };

  const isLevelCompleted = (level) => completedLevels.includes(level);

  const selectLevel = (level) => {
    setSelectedLevel(level);
    setCurrentExerciseIndex(0);
    resetExerciseState();
    exerciseScoresRef.current = [];
    setLevelCompleted(false);
    setLevelResults(null);
    setViewMode('exercise');
  };

  const resetExerciseState = () => {
    setUserAnswer('');
    setShowSampleAnswer(false);
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);
    textToSpeechService.resetPlayCount();
  };

  const getCurrentExercise = () => {
    if (!selectedLevel || !exercisesByLevel[selectedLevel]) return null;
    
    const levelExercises = exercisesByLevel[selectedLevel];
    if (!levelExercises || currentExerciseIndex >= levelExercises.length) {
      console.error('Exercise not found:', { selectedLevel, currentExerciseIndex, levelExercises });
      return null;
    }
    
    return levelExercises[currentExerciseIndex];
  };

  const handlePlayAudio = async () => {
    const currentExercise = getCurrentExercise();
    if (!currentExercise) {
      console.error('No current exercise found for audio playback');
      setError('Could not play audio. Please try selecting another exercise.');
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
        const result = await textToSpeechService.speak(currentExercise.transcript);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentExercise = getCurrentExercise();
    if (!currentExercise) {
      setError('No exercise selected. Please select a level and try again.');
      return;
    }
    
    if (!userAnswer.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    
    try {
      const scoreData = calculateDetailedScore(currentExercise);
      console.log('Generated score data:', scoreData); // For debugging
      
      if (!scoreData || !scoreData.metrics || !scoreData.metrics.contentAccuracy) {
        throw new Error('Invalid score data structure');
      }
      
      setDetailedScore(scoreData);
      setFeedback(generateFeedback(scoreData.percentageScore));
      setShowSampleAnswer(true);
      exerciseScoresRef.current.push({
        exerciseId: currentExercise.id,
        score: scoreData.percentageScore,
        details: scoreData
      });
      saveAttemptToHistory(currentExercise, scoreData);
    } catch (error) {
      console.error('Error calculating score:', error);
      setError('An error occurred while evaluating your answer. Please try again.');
    }
  };

  const handleNextExercise = () => {
    const levelExs = exercisesByLevel[selectedLevel] || [];
    if (currentExerciseIndex < levelExs.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      resetExerciseState();
    } else {
      finishLevel();
    }
  };

  const finishLevel = async () => {
    const scores = exerciseScoresRef.current.map(result => result.score);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    setLevelResults({
      level: selectedLevel,
      averageScore,
      exercises: exerciseScoresRef.current,
      date: new Date().toISOString()
    });
    if (averageScore >= 60 && !isLevelCompleted(selectedLevel)) {
      try {
        const updatedCompletedLevels = [...completedLevels, selectedLevel];
        setCompletedLevels(updatedCompletedLevels);
        const updatedLevelScores = { ...levelScores, [selectedLevel]: averageScore };
        setLevelScores(updatedLevelScores);
        if (userId) {
          await progressService.updateLevelCompletion(userId, updatedCompletedLevels, updatedLevelScores);
        }
      } catch (error) {
        console.error('Error saving level completion:', error);
        setError('Failed to save level completion.');
      }
    }
    setLevelCompleted(true);
  };

  const calculateDetailedScore = (exercise) => {
    // Simple similarity algorithm between user answer and transcript
    const userWords = userAnswer.toLowerCase().trim().split(/\s+/);
    const transcriptWords = exercise.transcript.toLowerCase().trim().split(/\s+/);
    
    let matchingWords = 0;
    let partialMatches = 0;
    const misspelledWords = [];
    
    userWords.forEach(userWord => {
      if (transcriptWords.includes(userWord)) {
        matchingWords++;
      } else {
        // Check for partial matches (e.g. singular/plural, tense differences)
        let partialMatch = false;
        for (const transcriptWord of transcriptWords) {
          if (userWord.length > 3 && transcriptWord.length > 3) {
            if (userWord.includes(transcriptWord.substring(0, 3)) || 
                transcriptWord.includes(userWord.substring(0, 3))) {
              partialMatches += 0.5;
              partialMatch = true;
              misspelledWords.push({ 
                original: transcriptWord, 
                transcribed: userWord, 
                position: userWords.indexOf(userWord) 
              });
              break;
            }
          }
        }
        
        if (!partialMatch) {
          // Find the closest word in the transcript
          let closestWord = '';
          let minDistance = Infinity;
          
          for (const transcriptWord of transcriptWords) {
            const distance = levenshteinDistance(userWord, transcriptWord);
            if (distance < minDistance) {
              minDistance = distance;
              closestWord = transcriptWord;
            }
          }
          
          misspelledWords.push({ 
            original: closestWord, 
            transcribed: userWord, 
            position: userWords.indexOf(userWord) 
          });
        }
      }
    });
    
    const totalScore = matchingWords + partialMatches;
    const maxScore = Math.max(userWords.length, transcriptWords.length);
    const percentageScore = Math.min(100, Math.round((totalScore / maxScore) * 100));
    
    // Fix the object structure - removed the duplicate percentageScore property
    return {
      metrics: {
        contentAccuracy: {
          correctWords: matchingWords,
          totalWords: transcriptWords.length,
          misspelledWords: misspelledWords,
          score: Math.min(5, Math.round((matchingWords / transcriptWords.length) * 5))
        },
        speechPatterns: {
          pausesAtPunctuation: { detected: 0, expected: 0, score: 0 },
          speaking: { duration: 0, expectedDuration: 0, score: 2 },
          intonation: { score: 2 }
        },
        attemptScore: Math.round(percentageScore / 20) // 0-5 score based on percentage
      },
      totalScore: Math.round(percentageScore / 10), // 0-10 score
      percentageScore // Using shorthand object property notation
    };
  };

  // Helper function to calculate Levenshtein distance (edit distance) between two strings
  const levenshteinDistance = (a, b) => {
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

  const generateFeedback = (percentage) => {
    if (percentage >= 80) return "Excellent work! Your answer closely matches the expected response.";
    if (percentage >= 60) return "Good job! Your answer captures many of the key points.";
    if (percentage >= 40) return "You're on the right track. Try to include more key points from the audio.";
    return "Keep practicing! Try to listen more carefully to capture the key information.";
  };

  const saveAttemptToHistory = async (exercise, scoreData) => {
    try {
      const attempt = {
        exerciseId: exercise.id,
        title: exercise.title,
        score: scoreData.percentageScore,
        transcript: userAnswer,
        metrics: scoreData.metrics,
        date: new Date().toISOString()
      };
      if (!userId) {
        setError('User not logged in');
        return;
      }
      await progressService.saveTrainingAttempt(userId, 'listening', attempt);
      setAttemptHistory([...attemptHistory, attempt]);
    } catch (error) {
      console.error('Error saving attempt:', error);
      setError('Failed to save attempt.');
    }
  };

  // Function to go back to level selection
  const handleBackToLevels = () => {
    setViewMode('levels');
    if (levelCompleted) {
      resetExerciseState();
      setLevelCompleted(false);
      setLevelResults(null);
    }
  };

  // Check if user has completed enough levels to finish the module
  const hasCompletedEnough = () => {
    const totalLevels = Object.keys(exercisesByLevel).length;
    return completedLevels.length >= Math.ceil(totalLevels * 0.5);
  };

  return (
    <div className="training-container">
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading listening exercises...</p>
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
            <h1>Listening & Writing Training</h1>
            <p className="training-description">
              Improve your listening skills by practicing with these audio exercises.
              Listen carefully to the audio and write what you hear to enhance your comprehension.
            </p>
            
            <div className="training-progress">
              <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />
              
              {hasCompletedEnough() ? (
                <div className="progress-message success">
                  <span className="checkmark">✓</span>
                  Congratulations! You have completed the Listening module!
                </div>
              ) : (
                <div className="progress-message">
                  Complete {Math.ceil(Object.keys(exercisesByLevel).length * 0.5) - completedLevels.length} more level(s) to complete this module.
                </div>
              )}
            </div>
          </div>
          
          {viewMode === 'levels' && (
            <div className="level-selection">
              <h2>Select a Difficulty Level</h2>
              <div className="level-grid">
                {Object.keys(exercisesByLevel).map((level) => (
                  <div 
                    key={level} 
                    className={`level-card ${isLevelCompleted(level) ? 'completed' : ''}`}
                    onClick={() => selectLevel(level)}
                  >
                    <h3>
                      Level: {level}
                      {isLevelCompleted(level) && <span className="card-checkmark">✓</span>}
                    </h3>
                    <div className="level-card-content">
                      <p>
                        {exercisesByLevel[level].length} exercises
                        {levelScores[level] && ` • Score: ${levelScores[level]}%`}
                      </p>
                    </div>
                    <div className="card-footer">
                      <span className="difficulty-level">{level}</span>
                      {isLevelCompleted(level) && (
                        <span className="card-completed">Completed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {attemptHistory.length > 0 && (
                <div className="history-section">
                  <h3>Recent Attempts</h3>
                  <AttemptHistory attempts={attemptHistory.slice(-5)} exerciseType="listening" />
                </div>
              )}
            </div>
          )}
          
          {viewMode === 'exercise' && !levelCompleted && (
            <div className="exercise-container">
              <div className="exercise-header">
                <h2>Level: {selectedLevel}</h2>
                <button 
                  className="back-button" 
                  onClick={handleBackToLevels}
                >
                  ← Back to Levels
                </button>
              </div>
              
              {getCurrentExercise() ? (
                <div className="exercise-content">
                  <div className="exercise-title">
                    <h3>Exercise {currentExerciseIndex + 1} of {(exercisesByLevel[selectedLevel] || []).length}: {getCurrentExercise().title}</h3>
                  </div>
                  
                  <div className="audio-player">
                    <button 
                      className={`play-button ${isPlaying ? 'playing' : ''}`} 
                      onClick={handlePlayAudio}
                      disabled={maxPlaysReached}
                    >
                      <span className="play-icon">{isPlaying ? '⏸️' : '▶️'}</span>
                      {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </button>
                    
                    {maxPlaysReached && (
                      <div className="max-plays-message">
                        <span className="info-icon">ℹ️</span>
                        Maximum plays reached. Please submit your answer.
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={handleSubmit} className="answer-form">
                    <div className="form-group">
                      <label htmlFor="userAnswer">Type what you hear:</label>
                      <textarea
                        id="userAnswer"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="answer-textarea"
                      ></textarea>
                    </div>
                    <button 
                      type="submit" 
                      className="submit-button"
                      disabled={!userAnswer.trim()}
                    >
                      Submit Answer
                    </button>
                  </form>
                  
                  {feedback && (
                    <div className="feedback-container">
                      <h3>Feedback</h3>
                      <div className="feedback-text">{feedback}</div>
                      
                      <div className="score-display">
                        <h4>Your Score: {detailedScore ? detailedScore.percentageScore : 0}%</h4>
                        <div className="accuracy-meter">
                          <div 
                            className="accuracy-bar" 
                            style={{ 
                              width: `${detailedScore ? detailedScore.percentageScore : 0}%`,
                              backgroundColor: detailedScore && detailedScore.percentageScore >= 80 ? '#4caf50' : 
                                              detailedScore && detailedScore.percentageScore >= 60 ? '#ff9800' : '#f44336'
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {showSampleAnswer && (
                        <div className="sample-answer">
                          <h3>Sample Answer</h3>
                          <p>{getCurrentExercise().transcript}</p>
                        </div>
                      )}
                      
                      {detailedScore && (
                        <ScoreBreakdown scoreData={detailedScore} type="listening" />
                      )}
                      
                      <button 
                        onClick={handleNextExercise} 
                        className="next-button"
                      >
                        {currentExerciseIndex < (exercisesByLevel[selectedLevel] || []).length - 1 
                          ? 'Next Exercise' 
                          : 'Finish Level'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="error-message">
                  Exercise not found. Please select another level.
                </div>
              )}
            </div>
          )}
          
          {viewMode === 'exercise' && levelCompleted && levelResults && (
            <div className="level-results">
              <div className="results-header">
                <h2>Level {levelResults.level} Completed!</h2>
                <button 
                  onClick={handleBackToLevels} 
                  className="back-to-levels"
                >
                  Back to Levels
                </button>
              </div>
              
              <div className="level-score">
                <h3>Average Score: {levelResults.averageScore}%</h3>
                <ProgressBar percentage={levelResults.averageScore} />
                
                {levelResults.averageScore >= 60 ? (
                  <div className="level-passed">
                    <span className="checkmark-large">✓</span>
                    <p>Congratulations! You've passed this level with a score of {levelResults.averageScore}%.</p>
                  </div>
                ) : (
                  <div className="level-failed">
                    <p>You scored {levelResults.averageScore}%. You need at least 60% to complete this level.</p>
                    <button 
                      onClick={() => {
                        setCurrentExerciseIndex(0);
                        resetExerciseState();
                        exerciseScoresRef.current = [];
                        setLevelCompleted(false);
                        setLevelResults(null);
                      }} 
                      className="retry-level"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
              
              <div className="exercise-scores">
                <h3>Exercise Results</h3>
                <div className="exercise-scores-list">
                  {levelResults.exercises.map((exercise, index) => (
                    <div key={index} className="exercise-score-item">
                      <span className="exercise-number">Exercise {index + 1}</span>
                      <div className="exercise-score-bar">
                        <div 
                          className="exercise-score-fill" 
                          style={{ 
                            width: `${exercise.score}%`,
                            backgroundColor: exercise.score >= 80 ? '#4caf50' : 
                                          exercise.score >= 60 ? '#ff9800' : '#f44336'
                          }}
                        ></div>
                      </div>
                      <span className="exercise-score-value">{exercise.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ListeningTraining;