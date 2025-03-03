import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import listeningExercises from '../../training/listeningExercises.json';
import ProgressBar from '../common/ProgressBar';
import ScoreBreakdown from '../common/ScoreBreakdown';
import AttemptHistory from '../common/AttemptHistory';
import textToSpeechService from '../../services/TextToSpeechService';
import './TrainingStyles.css';

const ListeningTraining = () => {
  const navigate = useNavigate();
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
  
  const exerciseScoresRef = useRef([]);
  
  // Process exercises into levels
  useEffect(() => {
    // Convert from nested format to flat exercises with level property
    const allExercises = [];
    const levelGroups = {};
    
    listeningExercises.forEach(levelGroup => {
      const level = levelGroup.level;
      const exercises = levelGroup.exercises.map(exercise => ({
        ...exercise,
        level: level
      }));
      
      levelGroups[level] = exercises;
      allExercises.push(...exercises);
    });
    
    setExercisesByLevel(levelGroups);
    setExercises(allExercises);
  }, []);
  
  useEffect(() => {
    // Check if learning and previous modules are completed
    const checkPreviousCompletion = () => {
      try {
        // Check learning completion
        const savedLearningProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
        const learningTopics = ['parts-of-speech', 'tenses', 'sentence-correction', 'communication'];
        const allLearningCompleted = learningTopics.every(topic => 
          savedLearningProgress[topic] && savedLearningProgress[topic].completed
        );
        
        setLearningCompleted(allLearningCompleted);
        
        // Check if reading module is at least 50% completed
        const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
        if (!trainingResults.reading) {
          trainingResults.reading = [];
        }
        
        const readingCompletionPercentage = (trainingResults.reading.length / 5) * 100; // Assuming 5 total reading passages
        const isReadingModuleCompleted = readingCompletionPercentage >= 50;
        
        setReadingCompleted(isReadingModuleCompleted);
        
        // Redirect if prerequisites not met
        if (!allLearningCompleted) {
          navigate('/learning/parts-of-speech');
        } else if (!isReadingModuleCompleted) {
          navigate('/training/reading');
        }
      } catch (error) {
        console.error('Error checking completion:', error);
      }
    };
    
    checkPreviousCompletion();
    
    // Load completed exercises and levels
    loadCompletedData();
    
    // Reset text-to-speech play count when component mounts
    textToSpeechService.resetPlayCount();
    
    return () => {
      // Cancel any ongoing speech synthesis when component unmounts
      textToSpeechService.cancel();
    };
  }, [navigate]);
  
  // Load completed exercises and levels from localStorage
  const loadCompletedData = () => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.listening) {
        trainingResults.listening = [];
      }
      
      // Get completed exercise IDs
      const completed = trainingResults.listening.map(result => result.exerciseId);
      setCompletedExercises(completed);
      
      // Get completed levels
      if (trainingResults.listeningLevels) {
        setCompletedLevels(trainingResults.listeningLevels);
        
        // Load level scores
        setLevelScores(trainingResults.listeningLevelScores || {});
      } else {
        // Initialize empty arrays
        trainingResults.listeningLevels = [];
        trainingResults.listeningLevelScores = {};
        localStorage.setItem('trainingResults', JSON.stringify(trainingResults));
      }
    } catch (error) {
      console.error('Error loading completed data:', error);
    }
  };
  
  // Calculate completion percentage across all levels
  const calculateCompletionPercentage = () => {
    const totalLevels = Object.keys(exercisesByLevel).length;
    return totalLevels > 0 ? (completedLevels.length / totalLevels) * 100 : 0;
  };
  
  // Check if level is completed
  const isLevelCompleted = (level) => {
    return completedLevels.includes(level);
  };
  
  // Select a difficulty level
  const selectLevel = (level) => {
    setSelectedLevel(level);
    setCurrentExerciseIndex(0);
    resetExerciseState();
    exerciseScoresRef.current = [];
    setLevelCompleted(false);
    setLevelResults(null);
  };
  
  // Reset the state for a new exercise
  const resetExerciseState = () => {
    setUserAnswer('');
    setShowSampleAnswer(false);
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);
    textToSpeechService.resetPlayCount();
  };
  
  // Get current exercise in the sequence
  const getCurrentExercise = () => {
    if (!selectedLevel || !exercisesByLevel[selectedLevel]) return null;
    
    return exercisesByLevel[selectedLevel][currentExerciseIndex];
  };
  
  // Handle playing audio for current exercise
  const handlePlayAudio = async () => {
    const currentExercise = getCurrentExercise();
    if (!currentExercise) return;
    
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
        // Use the transcript from the exercise data
        const result = await textToSpeechService.speak(currentExercise.transcript);
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
  
  // Handle submitting an answer for the current exercise
  const handleSubmit = (e) => {
    e.preventDefault();
    const currentExercise = getCurrentExercise();
    if (!currentExercise) return;
    
    // Calculate detailed score
    const scoreData = calculateDetailedScore(currentExercise);
    setDetailedScore(scoreData);
    
    // Generate feedback based on score
    setFeedback(generateFeedback(scoreData.percentageScore));
    
    // Show sample answer
    setShowSampleAnswer(true);
    
    // Save current exercise score
    exerciseScoresRef.current.push({
      exerciseId: currentExercise.id,
      score: scoreData.percentageScore,
      details: scoreData
    });
    
    // Save attempt to history
    saveAttemptToHistory(currentExercise, scoreData);
  };
  
  // Move to the next exercise in the sequence
  const handleNextExercise = () => {
    const exercises = exercisesByLevel[selectedLevel] || [];
    
    if (currentExerciseIndex < exercises.length - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      resetExerciseState();
    } else {
      // All exercises in level completed
      finishLevel();
    }
  };
  
  // Handle level completion
  const finishLevel = () => {
    // Calculate level score (average of all exercise scores)
    const scores = exerciseScoresRef.current.map(result => result.score);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) 
      : 0;
    
    // Set level results
    setLevelResults({
      level: selectedLevel,
      averageScore,
      exercises: exerciseScoresRef.current,
      date: new Date().toISOString()
    });
    
    // Mark level as completed if score is sufficient (>= 60%)
    if (averageScore >= 60 && !isLevelCompleted(selectedLevel)) {
      // Update completed levels
      const updatedCompletedLevels = [...completedLevels, selectedLevel];
      setCompletedLevels(updatedCompletedLevels);
      
      // Update level scores
      const updatedLevelScores = { ...levelScores, [selectedLevel]: averageScore };
      setLevelScores(updatedLevelScores);
      
      // Save to localStorage
      try {
        const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
        trainingResults.listeningLevels = updatedCompletedLevels;
        trainingResults.listeningLevelScores = updatedLevelScores;
        localStorage.setItem('trainingResults', JSON.stringify(trainingResults));
      } catch (error) {
        console.error('Error saving level completion:', error);
      }
    }
    
    // Show level completion
    setLevelCompleted(true);
  };
  
  // Calculate detailed score for an exercise
  const calculateDetailedScore = (exercise) => {
    // Initialize metrics
    const metrics = {
      attemptScore: 3, // Automatic points for attempting
      spelling: {
        correctWords: 0,
        totalWords: 0,
        misspelledWords: [],
        score: 0 // Out of 3
      },
      content: {
        keyPointsMatched: 0,
        totalKeyPoints: 0,
        score: 0 // Out of 5
      },
      punctuation: {
        correctPunctuation: 0,
        totalPunctuation: 0,
        score: 0 // Out of 2
      }
    };
    
    // 1. Spelling check (simple implementation)
    const userWords = userAnswer.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
    const transcriptWords = exercise.transcript.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
    
    // Count total words
    metrics.spelling.totalWords = userWords.length;
    
    // Simple spell check (we'd use a real spellcheck library in production)
    const spellCheckResults = userWords.map(word => {
      // Remove punctuation for spell checking
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      
      // Check if word appears in the original transcript (very basic spell check)
      const isCorrect = transcriptWords.some(tw => 
        tw.replace(/[.,!?;:]/g, '') === cleanWord
      );
      
      return {
        word,
        isCorrect
      };
    });
    
    // Count correct words
    metrics.spelling.correctWords = spellCheckResults.filter(r => r.isCorrect).length;
    
    // Store misspelled words
    metrics.spelling.misspelledWords = spellCheckResults
      .filter(r => !r.isCorrect)
      .map(r => r.word);
    
    // Calculate spelling score (out of 3)
    const spellingRatio = metrics.spelling.totalWords > 0 ? 
      metrics.spelling.correctWords / metrics.spelling.totalWords : 0;
    metrics.spelling.score = Math.min(3, Math.round(spellingRatio * 3));
    
    // 2. Content accuracy (key points matching)
    // Extract key points from the transcript (simplified approach)
    const keyPoints = exercise.transcript.split('.').filter(s => s.trim().length > 0);
    metrics.content.totalKeyPoints = keyPoints.length;
    
    // Check how many key points are covered in the answer
    const userSentences = userAnswer.split('.').filter(s => s.trim().length > 0);
    
    // Count matches using simple keyword comparison
    let keyPointsMatched = 0;
    
    keyPoints.forEach(point => {
      // Extract important words from this point (words with 5+ characters)
      const keywords = point.toLowerCase().split(/\s+/).filter(w => 
        w.length > 5 && !['about', 'there', 'their', 'would', 'should', 'could'].includes(w)
      );
      
      // Check if at least one user sentence contains some of these keywords
      const hasMatch = userSentences.some(sentence => {
        const userWords = sentence.toLowerCase().split(/\s+/);
        // If at least 2 keywords match, count it as a match
        const matchCount = keywords.filter(keyword => 
          userWords.some(uw => uw.includes(keyword) || keyword.includes(uw))
        ).length;
        
        return matchCount >= 2 || matchCount >= Math.min(2, keywords.length);
      });
      
      if (hasMatch) {
        keyPointsMatched++;
      }
    });
    
    metrics.content.keyPointsMatched = keyPointsMatched;
    
    // Calculate content score (out of 5)
    const contentRatio = metrics.content.totalKeyPoints > 0 ? 
      metrics.content.keyPointsMatched / metrics.content.totalKeyPoints : 0;
    metrics.content.score = Math.min(5, Math.round(contentRatio * 5));
    
    // 3. Punctuation (simplified check)
    // Count punctuation marks in the transcript
    const transcriptPunctuation = (exercise.transcript.match(/[.,!?;:]/g) || []).length;
    metrics.punctuation.totalPunctuation = transcriptPunctuation;
    
    // Count punctuation in user answer
    const userPunctuation = (userAnswer.match(/[.,!?;:]/g) || []).length;
    
    // Give points based on similarity in punctuation quantity (simplified approach)
    const punctuationRatio = transcriptPunctuation > 0 ? 
      Math.min(userPunctuation / transcriptPunctuation, 1) : 0;
    metrics.punctuation.correctPunctuation = Math.round(transcriptPunctuation * punctuationRatio);
    metrics.punctuation.score = Math.min(2, Math.round(punctuationRatio * 2));
    
    // Calculate total score
    const totalScore = 
      metrics.attemptScore + 
      metrics.spelling.score + 
      metrics.content.score + 
      metrics.punctuation.score;
    
    // Convert to percentage
    const percentageScore = Math.round((totalScore / 10) * 100);
    
    return {
      metrics,
      totalScore,
      percentageScore
    };
  };
  
  // Generate feedback based on score
  const generateFeedback = (score) => {
    if (score >= 90) {
      return "Excellent! Your answer demonstrates thorough understanding of the audio content.";
    } else if (score >= 75) {
      return "Great job! Your answer captures most of the important points from the audio.";
    } else if (score >= 60) {
      return "Good work! You've understood the main ideas, though some details were missed.";
    } else if (score >= 40) {
      return "You've captured some of the content, but there's room for improvement in your listening comprehension.";
    } else {
      return "Try listening to the audio again and focus on the main points being discussed.";
    }
  };
  
  // Save attempt to history without marking as completed
  const saveAttemptToHistory = (exercise, scoreData) => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('trainingResults') || '{}');
      if (!trainingResults.listeningHistory) {
        trainingResults.listeningHistory = [];
      }
      
      const newAttempt = {
        exerciseId: exercise.id,
        title: exercise.title,
        level: selectedLevel,
        date: new Date().toISOString(),
        userAnswer: userAnswer,
        score: scoreData.percentageScore,
        detailedMetrics: scoreData.metrics
      };
      
      trainingResults.listeningHistory.push(newAttempt);
      localStorage.setItem('trainingResults', JSON.stringify(trainingResults));
      
      // Update attempt history
      setAttemptHistory([...attemptHistory, newAttempt]);
      
    } catch (error) {
      console.error('Error saving attempt to history:', error);
    }
  };
  
  const handleBackToLevels = () => {
    setSelectedLevel(null);
    setCurrentExerciseIndex(0);
    resetExerciseState();
    exerciseScoresRef.current = [];
    setLevelCompleted(false);
    setLevelResults(null);
  };
  
  // Reset for a new attempt
  const handleTryAgain = () => {
    textToSpeechService.resetPlayCount();
    setUserAnswer('');
    setShowSampleAnswer(false);
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);
  };
  
  // Check if user has completed at least 50% of levels
  const hasCompletedEnough = () => {
    const totalLevels = Object.keys(exercisesByLevel).length;
    return completedLevels.length >= Math.ceil(totalLevels * 0.5);
  };
  
  // Get next training module
  const goToNextModule = () => {
    navigate('/softskills/training/speaking');
  };

  return (
    <div className="training-container">
      <div className="training-header">
        <h1>Listening & Writing Practice</h1>
        <p className="training-description">
          Improve your listening comprehension and writing skills. 
          Listen to the audio (up to 2 times), then write what you heard.
          Complete at least 50% of the difficulty levels to unlock the next module.
        </p>
        
        <div className="training-progress">
          <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
          <ProgressBar percentage={calculateCompletionPercentage()} />
          
          {hasCompletedEnough() ? (
            <div className="progress-message success">
              <span className="checkmark">✓</span>
              You have completed enough levels to move to the next module!
            </div>
          ) : (
            <div className="progress-message">
              Complete {Math.ceil(Object.keys(exercisesByLevel).length * 0.5) - completedLevels.length} more 
              level(s) to unlock the next module.
            </div>
          )}
          
          {hasCompletedEnough() && (
            <button 
              className="next-module-button"
              onClick={goToNextModule}
            >
              Go to Speaking Practice
            </button>
          )}
        </div>
      </div>
      
      {!selectedLevel ? (
        // Level selection screen
        <div className="level-selection">
          <h2>Select a Difficulty Level</h2>
          <div className="cards-grid">
            {Object.keys(exercisesByLevel).map(level => (
              <div 
                className={`training-card ${isLevelCompleted(level) ? 'completed' : ''}`}
                key={level}
                onClick={() => selectLevel(level)}
              >
                <h3>
                  {level} Level
                  {isLevelCompleted(level) && <span className="card-checkmark">✓</span>}
                </h3>
                <div className="card-content">
                  <p><strong>{exercisesByLevel[level].length}</strong> listening exercises</p>
                  {levelScores[level] && (
                    <p>Your score: <strong>{levelScores[level]}%</strong></p>
                  )}
                </div>
                <div className="card-footer">
                  <span className="card-level">{level}</span>
                  {isLevelCompleted(level) && (
                    <span className="card-completed">Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : levelCompleted ? (
        // Level completion screen
        <div className="level-completion">
          <div className="exercise-header">
            <h2>{selectedLevel} Level Completed</h2>
            <button className="back-button" onClick={handleBackToLevels}>
              ← Back to Levels
            </button>
          </div>
          
          <div className="level-results">
            <div className="level-score">
              <h3>Level Score</h3>
              <div className="score-circle">
                <span className="score-number">{levelResults?.averageScore || 0}</span>
                <span className="score-max">%</span>
              </div>
              
              {levelResults?.averageScore >= 60 ? (
                <div className="completion-notification">
                  <span className="checkmark">✓</span>
                  Congratulations! You've successfully completed this level.
                </div>
              ) : (
                <div className="retry-prompt">
                  <p>You need at least 60% score to mark this level as completed.</p>
                  <button 
                    className="retry-button"
                    onClick={() => selectLevel(selectedLevel)}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
            
            <div className="exercises-summary">
              <h3>Exercises Completed</h3>
              <div className="exercises-list">
                {levelResults?.exercises.map((exercise, index) => (
                  <div key={index} className="exercise-result">
                    <div className="exercise-title">
                      Exercise {index + 1}: {exercisesByLevel[selectedLevel][index]?.title}
                    </div>
                    <div className="exercise-score">
                      Score: {exercise.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="level-actions">
              <button className="next-module-button" onClick={handleBackToLevels}>
                Back to Level Selection
              </button>
              
              {hasCompletedEnough() && (
                <button className="next-module-button" onClick={goToNextModule}>
                  Go to Speaking Practice
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Exercise screen
        <div className="listening-practice">
          <div className="exercise-header">
            <h2>{selectedLevel} Level - Exercise {currentExerciseIndex + 1}/{exercisesByLevel[selectedLevel]?.length}</h2>
            <button className="back-button" onClick={handleBackToLevels}>
              ← Back to Levels
            </button>
          </div>
          
          {getCurrentExercise() && (
            <>
              <div className="exercise-question">
                <h3>{getCurrentExercise().title}</h3>
                <p>{getCurrentExercise().question}</p>
              </div>
              
              <div className="audio-player">
                <p className="instruction">
                  Listen to the audio to answer the question. You can listen up to 2 times.
                </p>
                
                <button 
                  className={`play-button ${isPlaying ? 'playing' : ''} ${maxPlaysReached ? 'disabled' : ''}`}
                  onClick={handlePlayAudio}
                  disabled={maxPlaysReached}
                >
                  {isPlaying ? 'Pause Audio' : maxPlaysReached ? 'Max Plays Reached' : 'Play Audio'}
                </button>
                
                <p className="play-count">
                  Plays: {textToSpeechService.getPlayCount()}/2
                </p>
                
                {maxPlaysReached && (
                  <div className="max-plays-notice">
                    <p>You've reached the maximum number of plays. Please proceed with your answer.</p>
                  </div>
                )}
              </div>
              
              {!detailedScore ? (
                <form onSubmit={handleSubmit} className="answer-form">
                  <div className="form-group">
                    <label htmlFor="answer">Your Response:</label>
                    <textarea
                      id="answer"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      rows={6}
                      placeholder="Type what you heard here..."
                      required
                    ></textarea>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={userAnswer.trim().length < 10}
                  >
                    Submit Answer
                  </button>
                </form>
              ) : (
                <>
                  <div className="user-response">
                    <h3>Your Response:</h3>
                    <p className="user-answer-text">{userAnswer}</p>
                  </div>
                  
                  {feedback && (
                    <div className="feedback-container">
                      <h3>Feedback</h3>
                      <p className="feedback-text">{feedback}</p>
                      
                      <div className="action-buttons">
                        <button 
                          className="try-again-button"
                          onClick={handleTryAgain}
                        >
                          Try Again
                        </button>
                        
                        <button 
                          className="next-exercise-button"
                          onClick={handleNextExercise}
                        >
                          {currentExerciseIndex < (exercisesByLevel[selectedLevel]?.length - 1) 
                            ? "Next Exercise" 
                            : "Finish Level"}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <ScoreBreakdown 
                    scoreData={detailedScore} 
                    type="listening" 
                  />
                  
                  {showSampleAnswer && (
                    <div className="sample-answer">
                      <h3>Sample Answer</h3>
                      <p>{getCurrentExercise().sampleAnswer}</p>
                      <div className="reflection-prompt">
                        <h4>Self-Reflection</h4>
                        <p>Compare your answer with the sample. What points did you include or miss? 
                           How could you improve your response next time?</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ListeningTraining;