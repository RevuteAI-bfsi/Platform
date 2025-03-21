import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import listeningExercises from "../../training/listeningExercises.json";
import ProgressBar from "../common/ProgressBar";
import ScoreBreakdown from "../common/ScoreBreakdown";
import AttemptHistory from "../common/AttemptHistory";
import textToSpeechService from "../../services/TextToSpeechService";
import progressService from "../../services/progressService";
import { determineSkillType } from "../../utils/skillTypeUtils";
import ModuleAccessAlert from "../common/ModuleAccessAlert";
import "./ListeningTraining.css";

const ListeningTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [exercises, setExercises] = useState([]);
  const [accessError, setAccessError] = useState(null);
  const [exercisesByLevel, setExercisesByLevel] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
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
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(null);
  const [bestAttempt, setBestAttempt] = useState(null);
  const [maxPlaysReached, setMaxPlaysReached] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [levelResults, setLevelResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);

  // View mode to switch between level selection and exercise view
  const [viewMode, setViewMode] = useState("levels");

  const exerciseScoresRef = useRef([]);
  const userId = localStorage.getItem("userId");

  // Use consistent skill type detection
  const skillType = determineSkillType(location.pathname);

  // Pre-process exercises on component mount
  useEffect(() => {
    try {
      console.log("Initializing ListeningTraining component...");

      // Safely check if listeningExercises is available and valid
      if (!listeningExercises || !Array.isArray(listeningExercises)) {
        console.error(
          "Error: listeningExercises is not a valid array",
          listeningExercises
        );
        setError("Failed to load listening exercises data. Please try again.");
        setLoading(false);
        return;
      }

      console.log("Processing listening exercises data...");

      // Process exercises into levels
      const allExercises = [];
      const levelGroups = {};

      listeningExercises.forEach((levelGroup) => {
        const level = levelGroup.level;

        if (!levelGroup.exercises || !Array.isArray(levelGroup.exercises)) {
          console.warn(`Level ${level} has invalid exercises data`);
          return;
        }

        const exs = levelGroup.exercises.map((exercise) => ({
          ...exercise,
          level,
        }));
        levelGroups[level] = exs;
        allExercises.push(...exs);
      });

      console.log(
        `Processed ${allExercises.length} exercises across ${
          Object.keys(levelGroups).length
        } levels`
      );

      setExercisesByLevel(levelGroups);
      setExercises(allExercises);
      setContentLoaded(true);
    } catch (err) {
      console.error("Error processing exercises data:", err);
      setError("Failed to process exercises data. Please try again.");
    }
  }, []);

  // Check previous completion and load user progress
  useEffect(() => {
    const checkPreviousCompletion = async () => {
      try {
        setLoading(true);

        if (!userId) {
          setError("User not logged in");
          return;
        }

        console.log(
          `Checking previous completion for user ${userId}, skillType ${skillType}`
        );

        // First, check localStorage for completion status (faster)
        const completedTopicsFromStorage = JSON.parse(
          localStorage.getItem(`${skillType}_completed`) || "[]"
        );

        // Get the appropriate learning topics for this skill type
        let learningTopics = [];
        if (skillType === "softskills") {
          learningTopics = [
            "parts-of-speech",
            "tenses",
            "sentence-correction",
            "communication",
          ];
        } else if (skillType === "sales") {
          learningTopics = [
            "introduction",
            "telecalling",
            "skills-needed",
            "telecalling-module",
          ];
        } else if (skillType === "product") {
          learningTopics = ["bank-terminologies", "casa-kyc", "personal-loans"];
        }

        // Check if all required topics are completed in localStorage
        const allCompletedInStorage = learningTopics.every((topic) =>
          completedTopicsFromStorage.includes(topic)
        );

        console.log(
          `Learning completion status from localStorage: ${allCompletedInStorage}`
        );

        // If all topics are completed in localStorage, we can skip the API call
        if (allCompletedInStorage) {
          setLearningCompleted(true);

          // Continue with loading training progress
          const userProgress = await progressService.getUserProgress(userId);
          const trainingProgress = userProgress.trainingProgress || {};

          // Check if reading module is completed
          let readingCompletionPercentage = 0;
          if (trainingProgress.reading) {
            if (Array.isArray(trainingProgress.reading)) {
              // Old structure
              const readingAttempts = trainingProgress.reading || [];
              readingCompletionPercentage = (readingAttempts.length / 5) * 100;
            } else {
              // New structure
              const readingPassageIds = Object.keys(trainingProgress.reading);
              readingCompletionPercentage =
                (readingPassageIds.length / 5) * 100;
            }
          }

          const isReadingModuleCompleted = readingCompletionPercentage >= 50;
          setReadingCompleted(isReadingModuleCompleted);

          if (!isReadingModuleCompleted) {
            setAccessError({
              message: `You need to complete at least 50% of the Reading module before accessing Listening Training. (Current progress: ${Math.round(
                readingCompletionPercentage
              )}%)`,
              redirectPath: `/${skillType}/training/reading`,
            });
            setLoading(false);
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
        const allCompleted = learningTopics.every(
          (topic) =>
            learningProgress[topic] && learningProgress[topic].completed
        );

        console.log(
          `All ${skillType} learning topics completed? ${allCompleted}`
        );

        // Store in localStorage for future checks
        if (allCompleted) {
          localStorage.setItem(
            `${skillType}_completed`,
            JSON.stringify(learningTopics)
          );
        }

        setLearningCompleted(allCompleted);

        if (!allCompleted) {
          console.log(
            "Not all learning topics completed, redirecting to learning page"
          );
          navigate(`/${skillType}/learning/${learningTopics[0]}`);
          return;
        }

        // Check if reading module is completed
        const trainingProgress = userProgress.trainingProgress || {};
        let readingCompletionPercentage = 0;
        if (trainingProgress.reading) {
          if (Array.isArray(trainingProgress.reading)) {
            // Old structure
            const readingAttempts = trainingProgress.reading || [];
            readingCompletionPercentage = (readingAttempts.length / 5) * 100;
          } else {
            // New structure
            const readingPassageIds = Object.keys(trainingProgress.reading);
            readingCompletionPercentage = (readingPassageIds.length / 5) * 100;
          }
        }

        const isReadingModuleCompleted = readingCompletionPercentage >= 50;
        setReadingCompleted(isReadingModuleCompleted);

        if (
          !isReadingModuleCompleted &&
          !location.pathname.includes("/training/listening")
        ) {
          console.log(
            "Reading module not completed, redirecting to reading page"
          );
          navigate(`/${skillType}/training/reading`);
          return;
        }

        await loadCompletedData();
        setLoading(false);
      } catch (err) {
        console.error("Error checking completion:", err);
        setError("Failed to load progress data. Please try again.");
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

  // Updated loadCompletedData to support new data structure
  const loadCompletedData = async () => {
    try {
      if (!userId) return;

      console.log("Loading completed exercises data...");

      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};

      let completed = [];
      let allAttempts = [];

      // Check if listening data is in new structure
      if (trainingProgress.listening) {
        if (
          typeof trainingProgress.listening === "object" &&
          !Array.isArray(trainingProgress.listening)
        ) {
          // New structure - object with exercise IDs as keys
          completed = Object.keys(trainingProgress.listening);

          // Collect all attempts from all exercises into a flat array for history display
          let bestScore = 0;
          let bestAttemptData = null;

          Object.values(trainingProgress.listening).forEach((exercise) => {
            if (exercise.metrics && Array.isArray(exercise.metrics)) {
              exercise.metrics.forEach((metric) => {
                const attemptData = {
                  ...metric,
                  exerciseId: exercise.id,
                  title: exercise.title,
                  date: metric.timestamp,
                  score: metric.percentage_score,
                };

                allAttempts.push(attemptData);

                // Track best attempt
                if (metric.percentage_score > bestScore) {
                  bestScore = metric.percentage_score;
                  bestAttemptData = attemptData;
                }
              });
            }
          });

          // Sort by timestamp (newest first)
          allAttempts.sort(
            (a, b) =>
              new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
          );

          if (bestAttemptData) {
            setBestAttempt(bestAttemptData);
          }
        } else {
          // Old structure - array of attempts
          const listeningAttempts = trainingProgress.listening || [];
          completed = listeningAttempts
            .map((result) => result.exerciseId)
            .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
          allAttempts = listeningAttempts;

          // Find best attempt
          if (listeningAttempts.length > 0) {
            const bestAttempt = listeningAttempts.reduce((best, current) =>
              current.score > best.score ? current : best
            );
            setBestAttempt(bestAttempt);
          }
        }
      }

      console.log(`Found ${completed.length} completed listening exercises`);

      setCompletedExercises(completed);
      setCompletedLevels(trainingProgress.completedLevels || []);
      setLevelScores(trainingProgress.levelScores || {});
      setAttemptHistory(allAttempts);
    } catch (error) {
      console.error("Error loading completed data:", error);
      setError("Failed to load completed data.");
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
    setViewMode("exercise");
  };

  const resetExerciseState = () => {
    setUserAnswer("");
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
      console.error("Exercise not found:", {
        selectedLevel,
        currentExerciseIndex,
        levelExercises,
      });
      return null;
    }

    return levelExercises[currentExerciseIndex];
  };

  const handlePlayAudio = async () => {
    const currentExercise = getCurrentExercise();
    if (!currentExercise) {
      console.error("No current exercise found for audio playback");
      setError("Could not play audio. Please try selecting another exercise.");
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
        const result = await textToSpeechService.speak(
          currentExercise.transcript
        );
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
      setError("No exercise selected. Please select a level and try again.");
      return;
    }

    if (!userAnswer.trim()) {
      setError("Please provide an answer before submitting.");
      return;
    }

    try {
      const scoreData = calculateDetailedScore(currentExercise);
      console.log("Generated score data:", scoreData); // For debugging

      if (!scoreData || !scoreData.metrics) {
        throw new Error("Invalid score data structure");
      }

      setDetailedScore(scoreData);
      setFeedback(generateDetailedFeedback(scoreData.metrics));
      setShowSampleAnswer(true);
      exerciseScoresRef.current.push({
        exerciseId: currentExercise.id,
        score: scoreData.metrics.percentage_score,
        details: scoreData,
      });
      saveAttemptToHistory(currentExercise, scoreData);
    } catch (error) {
      console.error("Error calculating score:", error);
      setError(
        "An error occurred while evaluating your answer. Please try again."
      );
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
    const scores = exerciseScoresRef.current.map((result) => result.score);
    const averageScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, score) => sum + score, 0) / scores.length
          )
        : 0;
    setLevelResults({
      level: selectedLevel,
      averageScore,
      exercises: exerciseScoresRef.current,
      date: new Date().toISOString(),
    });
    if (averageScore >= 60 && !isLevelCompleted(selectedLevel)) {
      try {
        const updatedCompletedLevels = [...completedLevels, selectedLevel];
        setCompletedLevels(updatedCompletedLevels);
        const updatedLevelScores = {
          ...levelScores,
          [selectedLevel]: averageScore,
        };
        setLevelScores(updatedLevelScores);
        if (userId) {
          await progressService.updateLevelCompletion(
            userId,
            updatedCompletedLevels,
            updatedLevelScores
          );
        }
      } catch (error) {
        console.error("Error saving level completion:", error);
        setError("Failed to save level completion.");
      }
    }
    setLevelCompleted(true);
    navigate(`/softskills/training/listening`);
  };

  // Updated calculateDetailedScore with 9-point system
  const calculateDetailedScore = (exercise) => {
    // Simple similarity algorithm between user answer and transcript
    const userWords = userAnswer.toLowerCase().trim().split(/\s+/);
    const transcriptWords = exercise.transcript
      .toLowerCase()
      .trim()
      .split(/\s+/);

    let matchingWords = 0;
    let partialMatches = 0;
    const misspelledWords = [];

    userWords.forEach((userWord) => {
      if (transcriptWords.includes(userWord)) {
        matchingWords++;
      } else {
        // Check for partial matches (e.g. singular/plural, tense differences)
        let partialMatch = false;
        for (const transcriptWord of transcriptWords) {
          if (userWord.length > 3 && transcriptWord.length > 3) {
            if (
              userWord.includes(transcriptWord.substring(0, 3)) ||
              transcriptWord.includes(userWord.substring(0, 3))
            ) {
              partialMatches += 0.5;
              partialMatch = true;
              misspelledWords.push({
                original: transcriptWord,
                transcribed: userWord,
                position: userWords.indexOf(userWord),
              });
              break;
            }
          }
        }

        if (!partialMatch) {
          // Find the closest word in the transcript
          let closestWord = "";
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
            position: userWords.indexOf(userWord),
          });
        }
      }
    });

    const totalScore = matchingWords + partialMatches;
    const maxScore = Math.max(userWords.length, transcriptWords.length);
    const contentAccuracyPercentage = Math.min(
      100,
      Math.round((totalScore / maxScore) * 100)
    );

    // New 9-point scoring system
    const metrics = {
      // Content accuracy (5 points)
      content_accuracy: {
        correct_words: matchingWords,
        total_words: transcriptWords.length,
        misspelled_words: misspelledWords,
        accuracy_percentage: contentAccuracyPercentage,
        score: Math.min(5, Math.round((contentAccuracyPercentage / 100) * 5)),
      },

      // Attempt participation (1 point)
      attempt: {
        made: true,
        score: 1, // Always 1 for attempting
      },

      // Comprehension (1 point)
      comprehension: {
        key_points_captured: Math.ceil(contentAccuracyPercentage / 20), // 0-5 scale
        score: contentAccuracyPercentage >= 60 ? 1 : 0.5,
      },

      // Spelling & grammar (1 point)
      spelling_grammar: {
        error_count: misspelledWords.length,
        error_percentage: Math.round(
          (misspelledWords.length / Math.max(1, userWords.length)) * 100
        ),
        score:
          misspelledWords.length <= Math.ceil(userWords.length * 0.1) ? 1 : 0.5,
      },

      // Completeness (1 point)
      completeness: {
        length_ratio: Math.min(1, userWords.length / transcriptWords.length),
        score: userWords.length >= transcriptWords.length * 0.8 ? 1 : 0.5,
      },

      // Calculate overall score (out of 9)
      overall_score: 0,
      percentage_score: 0,
    };

    metrics.overall_score =
      metrics.content_accuracy.score +
      metrics.attempt.score +
      metrics.comprehension.score +
      metrics.spelling_grammar.score +
      metrics.completeness.score;

    // Convert to percentage
    metrics.percentage_score = Math.round((metrics.overall_score / 10) * 100);

    return {
      metrics: metrics,
      totalScore: metrics.overall_score,
      percentageScore: metrics.percentage_score,
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
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // Enhanced feedback generator for 9-point system
  const generateDetailedFeedback = (metrics) => {
    const feedback = {
      summary: "",
      strengths: [],
      improvements: [],
    };

    // Overall summary based on total score
    const totalScore = metrics.overall_score;
    if (totalScore >= 8) {
      feedback.summary =
        "Excellent! Your transcription is highly accurate and complete.";
    } else if (totalScore >= 6) {
      feedback.summary =
        "Very good job! Your answer captures most of the audio content with good accuracy.";
    } else if (totalScore >= 4.5) {
      feedback.summary =
        "Good job! Your transcription shows understanding with some areas to improve.";
    } else if (totalScore >= 3) {
      feedback.summary =
        "You're making progress. Focus on capturing more words accurately.";
    } else {
      feedback.summary =
        "Keep practicing! Try to listen more carefully to capture the key information.";
    }

    // Identify strengths
    if (metrics.content_accuracy.score >= 3) {
      feedback.strengths.push(
        "Good content accuracy - you captured most words correctly"
      );
    }

    if (metrics.comprehension.score >= 0.75) {
      feedback.strengths.push("Good comprehension of the main message");
    }

    if (metrics.spelling_grammar.score >= 0.75) {
      feedback.strengths.push("Few spelling errors in your response");
    }

    if (metrics.completeness.score >= 0.75) {
      feedback.strengths.push(
        "Complete transcription that captures most of the content"
      );
    }

    // Identify areas for improvement
    if (metrics.content_accuracy.score < 3) {
      feedback.improvements.push(
        "Work on word-for-word accuracy when transcribing"
      );
    }

    if (metrics.comprehension.score < 0.75) {
      feedback.improvements.push(
        "Focus on understanding the main points of the audio"
      );
    }

    if (metrics.spelling_grammar.score < 0.75) {
      feedback.improvements.push("Practice correct spelling for common words");
    }

    if (metrics.completeness.score < 0.75) {
      feedback.improvements.push(
        "Try to include all parts of the audio in your transcription"
      );
    }

    return feedback;
  };

  // Updated to use the new database structure
  const saveAttemptToHistory = async (exercise, scoreData) => {
    try {
      if (!userId) {
        setError("User not logged in");
        return;
      }

      const attemptData = {
        timestamp: new Date().toISOString(),
        content_accuracy_score: scoreData.metrics.content_accuracy.score,
        attempt_score: scoreData.metrics.attempt.score,
        comprehension_score: scoreData.metrics.comprehension.score,
        spelling_grammar_score: scoreData.metrics.spelling_grammar.score,
        completeness_score: scoreData.metrics.completeness.score,
        overall_score: scoreData.metrics.overall_score,
        percentage_score: scoreData.metrics.percentage_score,
        transcript: userAnswer,
        misspelled_words: scoreData.metrics.content_accuracy.misspelled_words,
        feedback: generateDetailedFeedback(scoreData.metrics),
      };

      const data = {
        exerciseId: exercise.id,
        title: exercise.title,
        attemptData: attemptData,
        isFirstCompletion: !completedExercises.includes(exercise.id),
      };

      await progressService.saveListeningAttempt(userId, data);

      // Update local state
      if (
        !completedExercises.includes(exercise.id) &&
        scoreData.metrics.percentage_score >= 50
      ) {
        setCompletedExercises([...completedExercises, exercise.id]);
      }

      // Add to local attempt history for immediate display
      const newAttempt = {
        ...attemptData,
        exerciseId: exercise.id,
        title: exercise.title,
        date: attemptData.timestamp,
        score: attemptData.percentage_score,
      };

      setAttemptHistory([newAttempt, ...attemptHistory]);

      // Update best attempt if needed
      if (!bestAttempt || newAttempt.percentage_score > bestAttempt.score) {
        setBestAttempt(newAttempt);
      }
    } catch (error) {
      console.error("Error saving attempt:", error);
      setError("Failed to save attempt.");
    }
  };

  // Function to go back to level selection
  const handleBackToLevels = () => {
    setViewMode("levels");
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

  // Enhanced score breakdown for the new 9-point system
  const EnhancedScoreBreakdown = ({ scoreData }) => {
    if (!scoreData || !scoreData.metrics) return null;

    const { metrics } = scoreData;

    // Helper function for color coding
    const getScoreColor = (score, max) => {
      const ratio = score / max;
      if (ratio >= 0.8) return "#4caf50"; // green
      if (ratio >= 0.5) return "#ff9800"; // orange
      return "#f44336"; // red
    };

    return (
      <div className="enhanced-score-breakdown">
        <div className="score-header">
          <h3>Score Breakdown</h3>
          <div className="total-score">
            <div className="score-circle">
              <span className="score-number">
                {Math.round(metrics.overall_score)}
              </span>
              <span className="score-max">/10</span>
            </div>
            <div className="score-percentage">{metrics.percentage_score}%</div>
          </div>
        </div>

        <div className="new-score-categories">
          {/* Content Accuracy - 5 points */}
          <div className="score-category">
            <div className="category-header">
              <h4>Content Accuracy</h4>
              <div className="category-score">
                {metrics.content_accuracy?.score || 0}/5
              </div>
            </div>
            <div className="score-bar-container">
              <div
                className="score-bar"
                style={{
                  width: `${(metrics.content_accuracy?.score / 5) * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.content_accuracy?.score || 0,
                    5
                  ),
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Correct words:</span>
                <span className="detail-value">
                  {metrics.content_accuracy?.correct_words || 0} of{" "}
                  {metrics.content_accuracy?.total_words || 0}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Accuracy:</span>
                <span className="detail-value">
                  {metrics.content_accuracy?.accuracy_percentage || 0}%
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
                  backgroundColor: getScoreColor(
                    metrics.attempt?.score || 0,
                    1
                  ),
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item success">
                <span className="detail-check">✓</span> Attempt completed
              </div>
            </div>
          </div>

          {/* Comprehension - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Comprehension</h4>
              <div className="category-score">
                {metrics.comprehension?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div
                className="score-bar"
                style={{
                  width: `${(metrics.comprehension?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.comprehension?.score || 0,
                    1
                  ),
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Key points captured:</span>
                <span className="detail-value">
                  {metrics.comprehension?.key_points_captured || 0}/5
                </span>
              </div>
            </div>
          </div>

          {/* Spelling & Grammar - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Spelling & Grammar</h4>
              <div className="category-score">
                {metrics.spelling_grammar?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div
                className="score-bar"
                style={{
                  width: `${(metrics.spelling_grammar?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.spelling_grammar?.score || 0,
                    1
                  ),
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Spelling errors:</span>
                <span className="detail-value">
                  {metrics.spelling_grammar?.error_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Completeness - 1 point */}
          <div className="score-category">
            <div className="category-header">
              <h4>Completeness</h4>
              <div className="category-score">
                {metrics.completeness?.score || 0}/1
              </div>
            </div>
            <div className="score-bar-container">
              <div
                className="score-bar"
                style={{
                  width: `${(metrics.completeness?.score / 1) * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.completeness?.score || 0,
                    1
                  ),
                }}
              ></div>
            </div>
            <div className="category-details">
              <div className="detail-item">
                <span className="detail-label">Length ratio:</span>
                <span className="detail-value">
                  {Math.round((metrics.completeness?.length_ratio || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        {metrics.feedback && (
          <div className="enhanced-feedback-section">
            <h4>Feedback</h4>
            <p className="feedback-summary">{metrics.feedback.summary}</p>

            {metrics.feedback.strengths?.length > 0 && (
              <div className="feedback-strengths">
                <h5>Strengths:</h5>
                <ul>
                  {metrics.feedback.strengths.map((strength, index) => (
                    <li key={`strength-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {metrics.feedback.improvements?.length > 0 && (
              <div className="feedback-improvements">
                <h5>Areas for Improvement:</h5>
                <ul>
                  {metrics.feedback.improvements.map((improvement, index) => (
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

  // Enhanced attempt history display
  const EnhancedAttemptHistory = () => {
    if (attemptHistory.length === 0) return null;

    // Format date for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };

    // return (
    //   <div className="enhanced-history-section">
    //     <div className="history-header">
    //       <h3>Recent Attempts</h3>
    //       {bestAttempt && (
    //         <div className="best-attempt-badge">
    //           Best Score: {Math.round((bestAttempt.percentage_score || bestAttempt.score) / 100 * 9)}/9
    //           ({bestAttempt.percentage_score || bestAttempt.score}%)
    //         </div>
    //       )}
    //     </div>

    //     <div className="attempt-timeline">
    //       {attemptHistory.slice(0, 5).map((attempt, index) => (
    //         <div
    //           key={index}
    //           className={`attempt-item ${
    //             bestAttempt &&
    //             (attempt.timestamp === bestAttempt.timestamp ||
    //             attempt.date === bestAttempt.date) ? 'best-attempt' : ''
    //           }`}
    //         >
    //           <div className="attempt-date">{formatDate(attempt.timestamp || attempt.date)}</div>
    //           <div className="attempt-score">
    //             <strong>{Math.round(((attempt.percentage_score || attempt.score) / 100) * 9)}/9</strong>
    //             <span className="attempt-percentage">({attempt.percentage_score || attempt.score}%)</span>
    //           </div>
    //           <div className="attempt-title">{attempt.title}</div>
    //           {bestAttempt && (attempt.timestamp === bestAttempt.timestamp || attempt.date === bestAttempt.date) && (
    //             <div className="best-indicator">Best</div>
    //           )}
    //         </div>
    //       ))}
    //     </div>
    //   </div>
    // );
  };

  return (
    <div className="listening-container">
      {accessError && (
        <ModuleAccessAlert
          message={accessError.message}
          redirectPath={accessError.redirectPath}
          onClose={() => setAccessError(null)}
        />
      )}
      {loading && (
        <div className="listening-loading">
          <div className="listening-spinner"></div>
          <p>Loading listening exercises...</p>
        </div>
      )}

      {error && (
        <div className="listening-error">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="listening-clear-error"
          >
            Dismiss
          </button>
        </div>
      )}

      {!loading && (
        <>
          <div className="listening-header">
            <div className="ListeningSection-infoSection">
              <h1>Listening & Writing Training</h1>
              <p>
                Improve your listening skills by practicing with these audio
                exercises.
              </p>
              <p>You are allowed up to three attempts per passage.</p>
              <p>
                Consistent practice will help you earn higher rankings and
                achieve mastery.
              </p>
            </div>
            <div className="listening-progress">
              <h3>
                Module Progress
                 {/* ({Math.round(calculateCompletionPercentage())}%) */}
              </h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />

              {hasCompletedEnough() ? (
                <div className="listening-progress-message success">
                  <span className="listening-checkmark">✓</span>
                  Congratulations! You have completed the Listening module!
                </div>
              ) : (
                <div className="listening-progress-message">
                  Complete{" "}
                  {Math.ceil(Object.keys(exercisesByLevel).length * 0.5) -
                    completedLevels.length}{" "}
                  more level(s) to complete this module.
                </div>
              )}
            </div>
          </div>

          {viewMode === "levels" && (
            <div className="listening-level-selection">
              <h2>Select a Difficulty Level</h2>
              <div className="listening-instructions">
                <p>Choose a level to start practicing.</p>
              </div>
              <div className="listening-level-grid">
                {Object.keys(exercisesByLevel).map((level) => (
                  <div
                    key={level}
                    className={`listening-level-card ${
                      isLevelCompleted(level) ? "completed" : ""
                    }`}
                    onClick={() => selectLevel(level)}
                  >
                    <h3>
                      Level: {level}
                      {isLevelCompleted(level) && (
                        <span className="listening-card-checkmark">✓</span>
                      )}
                    </h3>
                    <div className="listening-level-card-content">
                      <p>
                        {exercisesByLevel[level].length} exercises
                        {levelScores[level] &&
                          ` • Score: ${levelScores[level]}%`}
                      </p>
                    </div>
                    <div className="listening-card-footer">
                      <span className="listening-difficulty-level">
                        {level}
                      </span>
                      {isLevelCompleted(level) && (
                        <span className="listening-card-completed">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {attemptHistory.length > 0 && <EnhancedAttemptHistory />}
            </div>
          )}

          {viewMode === "exercise" && !levelCompleted && (
            <div className="exercise-container">
              <div className="exercise-header">
                <h2>Level: {selectedLevel}</h2>
                <button className="back-button" onClick={handleBackToLevels}>
                  ← Back to Levels
                </button>
              </div>

              {getCurrentExercise() ? (
                <div className="exercise-content">
                  <div className="exercise-title">
                    <h3>
                      Exercise {currentExerciseIndex + 1} of{" "}
                      {(exercisesByLevel[selectedLevel] || []).length}:{" "}
                      {getCurrentExercise().title}
                    </h3>
                  </div>

                  <div className="audio-player">
                    <button
                      className={`play-button ${isPlaying ? "playing" : ""}`}
                      onClick={handlePlayAudio}
                      disabled={maxPlaysReached}
                    >
                      <span className="play-icon">
                        {isPlaying ? "⏸️" : "▶️"}
                      </span>
                      {isPlaying ? "Pause Audio" : "Play Audio"}
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
                      <div className="feedback-text">{feedback.summary}</div>

                      <div className="score-display">
                        <h4>
                          Your Score:{" "}
                          {detailedScore
                            ? detailedScore.metrics.percentage_score
                            : 0}
                          %
                        </h4>
                        <div className="accuracy-meter">
                          <div
                            className="accuracy-bar"
                            style={{
                              width: `${
                                detailedScore
                                  ? detailedScore.metrics.percentage_score
                                  : 0
                              }%`,
                              backgroundColor:
                                detailedScore &&
                                detailedScore.metrics.percentage_score >= 80
                                  ? "#4caf50"
                                  : detailedScore &&
                                    detailedScore.metrics.percentage_score >= 60
                                  ? "#ff9800"
                                  : "#f44336",
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
                        <EnhancedScoreBreakdown scoreData={detailedScore} />
                      )}

                      <button
                        onClick={handleNextExercise}
                        className="next-button"
                      >
                        {currentExerciseIndex <
                        (exercisesByLevel[selectedLevel] || []).length - 1
                          ? "Next Exercise"
                          : "Finish Level"}
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

          {/* {viewMode === 'exercise' && levelCompleted && levelResults && (
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
          )} */}
        </>
      )}
    </div>
  );
};

export default ListeningTraining;
