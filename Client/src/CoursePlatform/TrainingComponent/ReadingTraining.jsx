import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import readingPassages from "../../CoursePlatform/training/readingPassages.json";
import ProgressBar from "../../CoursePlatform/common/ProgressBar";
import ScoreBreakdown, { TranscriptComparison } from "../../CoursePlatform/common/ScoreBreakdown";
import AttemptHistory from "../../CoursePlatform/common/AttemptHistory";
import useGeminiAnalysis from "../../hooks/useGeminiAnalysis";
import AIAnalysis from "../../CoursePlatform/common/AIAnalysis";
import progressService from "../../services/progressService";
import ModuleAccessAlert from "../../CoursePlatform/common/ModuleAccessAlert";
import { determineSkillType } from "../../CoursePlatform/utils/skillTypeUtils";
import "./ReadingTraining.css";

const ReadingTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const transcriptBufferRef = useRef("");
  const [passages, setPassages] = useState([]);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [accuracy, setAccuracy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [completedPassages, setCompletedPassages] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [detailedScore, setDetailedScore] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [loading, setLoading] = useState(true); // Original overall loading state
  const [error, setError] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(150);
  const [timerActive, setTimerActive] = useState(false);
  const timerIntervalRef = useRef(null);
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(null);
  const [bestAttempt, setBestAttempt] = useState(null);
  const [passagesLoading, setPassagesLoading] = useState(true);
  const [getreadingProgress, setgetreadingProgress] = useState({});

  // NEW: Split static content vs. progress loading
  const [passagesLoaded, setPassagesLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const {
    analysis,
    isAnalyzing,
    error: aiError,
    analyzeReading,
    clearAnalysis,
  } = useGeminiAnalysis();
  const recognitionRef = useRef(null);

  const skillType = determineSkillType(location.pathname);

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Kick off the progress check in the background without awaiting it
        checkLearningCompletion();
        // Load the static passages immediately
        setPassages(readingPassages);
        setPassagesLoaded(true);
        // Initialize speech recognition
        initializeSpeechRecognition();
      } catch (error) {
        console.error("Error in component initialization:", error);
        setError("Failed to initialize component. Please try again.");
        setLoading(false);
      }
    };

    initializeComponent();

    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const TimerDisplay = () => {
    if (!isRecording) return null;
    return (
      <div className="timer-display">
        <div
          className={`timer-value ${timeRemaining < 30 ? "timer-warning" : ""}`}
        >
          {formatTime(timeRemaining)}
        </div>
        <div className="timer-label">Time Remaining</div>
      </div>
    );
  };

  const checkLearningCompletion = async () => {
    try {
      // Instead of blocking UI, we no longer set overall loading here.
      // setLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User not logged in");
        return;
      }
      console.log("Checking learning completion for reading training");

      const completedTopicsFromStorage = JSON.parse(
        localStorage.getItem("softskills_completed") || "[]"
      );

      const learningTopics = [
        "parts-of-speech",
        "tenses",
        "sentence-correction",
        "communication",
      ];

      const allCompletedInStorage = learningTopics.every((topic) =>
        completedTopicsFromStorage.includes(topic)
      );

      console.log(
        `Learning completion status from localStorage: ${allCompletedInStorage}`
      );

      if (allCompletedInStorage) {
        setLearningCompleted(true);
        await loadCompletedPassages();
        // Instead of setLoading(false), mark progress as loaded
        setProgressLoaded(true);
        return;
      }

      const { learningProgress } = await progressService.getUserProgress(
        userId
      );
      const softskillsProgress = learningProgress.softskills || {};

      learningTopics.forEach((topic) => {
        console.log(
          `Topic ${topic} completed in database: ${!!(
            softskillsProgress[topic] && softskillsProgress[topic].completed
          )}`
        );
      });

      const allCompleted = learningTopics.every(
        (topic) =>
          softskillsProgress[topic] && softskillsProgress[topic].completed
      );

      console.log(`All learning topics completed? ${allCompleted}`);

      if (allCompleted) {
        localStorage.setItem(
          "softskills_completed",
          JSON.stringify(learningTopics)
        );
      }

      setLearningCompleted(allCompleted);

      if (!allCompleted) {
        console.log(
          "Not all learning topics completed, redirecting to learning page"
        );
        navigate("/softskills/learning/parts-of-speech");
        return;
      }

      await loadCompletedPassages();
      // Mark progress loaded when done
      setProgressLoaded(true);
      // Optionally, you can still set the original loading to false if needed.
      setLoading(false);
    } catch (error) {
      console.error("Error checking learning completion:", error);
      setError("Failed to check completion status. Please try again.");
      setProgressLoaded(true);
      setLoading(false);
    }
  };

  const initializeSpeechRecognition = () => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;

      if (
        "speechGrammarList" in window ||
        "webkitSpeechGrammarList" in window
      ) {
        const SpeechGrammarList =
          window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammar = "#JSGF V1.0;";
        const speechGrammarList = new SpeechGrammarList();
        speechGrammarList.addFromString(grammar, 1);
        recognitionRef.current.grammars = speechGrammarList;
      }

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscriptSegment = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscriptSegment += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscriptSegment) {
          transcriptBufferRef.current += " " + finalTranscriptSegment;
          setTranscript(transcriptBufferRef.current.trim());
        } else if (interimTranscript) {
          setTranscript(transcriptBufferRef.current + " " + interimTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          stopRecording();
        }
      };
    } else {
      alert(
        "Speech recognition is not supported in your browser. Please try Chrome or Edge."
      );
    }
  };

  const loadCompletedPassages = async () => {
    try {
      setPassagesLoading(true); // Start loading passages progress

      const userId = localStorage.getItem("userId");
      if (!userId) {
        setPassagesLoading(false);
        return;
      }

      // Try to get from database first
      try {
        const userProgress = await progressService.getUserProgress(userId);
        const trainingProgress = userProgress.trainingProgress || {};

        let completed = [];

        if (trainingProgress.reading) {
          if (Array.isArray(trainingProgress.reading)) {
            completed = trainingProgress.reading
              .map((result) => result.passageId || result.exerciseId)
              .filter((id) => id)
              .filter((value, index, self) => self.indexOf(value) === index);
          } else {
            completed = Object.keys(trainingProgress.reading);
          }
        }

        console.log("Completed passages from DB:", completed);

        // Update state with database data
        setCompletedPassages(completed);

        // Update localStorage as backup
        localStorage.setItem(
          "completed_reading_passages",
          JSON.stringify(completed)
        );
      } catch (dbError) {
        console.error("Database fetch error:", dbError);

        // Fall back to localStorage only if database fetch fails
        const cachedPassages = localStorage.getItem("completed_reading_passages");
        if (cachedPassages) {
          setCompletedPassages(JSON.parse(cachedPassages));
        }
      }
    } catch (error) {
      console.error("Error loading completed passages:", error);
    } finally {
      setPassagesLoading(false);
    }
  };

  const calculateCompletionPercentage = () => {
    const percentage = (completedPassages.length / passages.length) * 100;
    return Math.min(percentage, 100);
  };

  const isPassageCompleted = (passageId) => {
    const passageIdStr = String(passageId);
    return completedPassages.some((id) => String(id) === passageIdStr);
  };

  const selectPassage = (passage) => {
    setSelectedPassage(passage);
    setTranscript("");
    transcriptBufferRef.current = "";
    setAccuracy(null);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    clearAnalysis();
    setSelectedAttemptIndex(null);
    loadAttemptHistory(passage.id);
    setTimeRemaining(150);
  };

  const loadAttemptHistory = async (passageId) => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      setgetreadingProgress(trainingProgress);

      if (
        trainingProgress.reading &&
        typeof trainingProgress.reading === "object" &&
        !Array.isArray(trainingProgress.reading)
      ) {
        const passageData = trainingProgress.reading[passageId];
        if (
          passageData &&
          passageData.metrics &&
          Array.isArray(passageData.metrics)
        ) {
          setAttemptHistory(passageData.metrics);

          if (passageData.metrics.length > 0) {
            const bestAttempt = passageData.metrics.reduce((best, current) =>
              current.overall_score > best.overall_score ? current : best
            );
            setBestAttempt(bestAttempt);
          }
        } else {
          setAttemptHistory([]);
          setBestAttempt(null);
        }
      } else {
        const history = (trainingProgress.reading || []).filter(
          (result) => result.passageId === passageId
        );
        setAttemptHistory(history);
        setBestAttempt(null);
      }
    } catch (error) {
      console.error("Error loading attempt history:", error);
    }
  };

  console.log("getSoftskillsProgress", getreadingProgress);

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript("");
      transcriptBufferRef.current = "";
      setAccuracy(null);
      setFeedback(null);
      setDetailedScore(null);
      setShowAIAnalysis(false);
      clearAnalysis();

      setRecordingStartTime(Date.now());

      setTimeRemaining(150);
      setTimerActive(true);
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            setAutoSubmitted(true);
            clearInterval(timerIntervalRef.current);
            stopRecording();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert(
        "Speech recognition is not supported in your browser. Please try Chrome or Edge."
      );
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      setIsRecording(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        setTimerActive(false);
      }

      const delayMs = timeRemaining <= 0 ? 1000 : 500;

      setTimeout(() => {
        const finalText =
          transcriptBufferRef.current.trim() || transcript.trim();

        if (selectedPassage && finalText) {
          if (finalText !== transcript) {
            setTranscript(finalText);
          }
          calculateDetailedScore();
        } else {
          setFeedback(
            "No readable content was detected. Please try again and speak clearly."
          );
          setAccuracy(0);
        }
      }, delayMs);
    }
  };

  const calculateDetailedScore = async () => {
    if (!selectedPassage || !transcript) {
      return;
    }

    const recordingDuration = (Date.now() - recordingStartTime) / 1000;

    const metrics = {
      passage_complete: {
        completed: false,
        within_time_limit: recordingDuration <= 150,
        score: 0,
      },
      attempt: {
        made: true,
        score: 1,
      },
      pronunciation: {
        mispronounced_words: [],
        mispronunciation_count: 0,
        score: 1,
      },
      pattern_following: {
        word_accuracy_percentage: 0,
        score: 0,
      },
      reading_speed: {
        wpm: 0,
        ideal_range: { min: 120, max: 150 },
        score: 0,
      },
      raw_data: {
        recording_duration: recordingDuration,
        expected_duration: 120,
        transcript: transcript,
        passage_text: selectedPassage.text,
      },
      overall_score: 0,
      percentage_score: 0,
    };

    const enhancedMetrics = calculateEnhancedMetrics(
      selectedPassage.text,
      transcript,
      recordingStartTime
    );

    const completionThreshold = 0.9;
    metrics.passage_complete.completed =
      enhancedMetrics.completeness.coverageRatio >= completionThreshold;

    if (
      metrics.passage_complete.completed &&
      metrics.passage_complete.within_time_limit
    ) {
      metrics.passage_complete.score = 5;
    } else if (metrics.passage_complete.completed) {
      metrics.passage_complete.score = 3;
    } else {
      metrics.passage_complete.score = Math.round(
        enhancedMetrics.completeness.coverageRatio * 3
      );
    }

    metrics.pronunciation.mispronounced_words =
      enhancedMetrics.accuracy.misspelledWords.map(
        (word) => word.original || word
      );
    metrics.pronunciation.mispronunciation_count =
      metrics.pronunciation.mispronounced_words.length;

    if (metrics.pronunciation.mispronunciation_count === 0) {
      metrics.pronunciation.score = 1;
    } else if (metrics.pronunciation.mispronunciation_count >= 3) {
      metrics.pronunciation.score = 0.5;
    } else {
      metrics.pronunciation.score = 0.75;
    }

    metrics.pattern_following.word_accuracy_percentage =
      (enhancedMetrics.accuracy.correctWords /
        enhancedMetrics.accuracy.totalWords) *
      100;

    if (metrics.pattern_following.word_accuracy_percentage >= 95) {
      metrics.pattern_following.score = 1;
    } else if (metrics.pattern_following.word_accuracy_percentage >= 80) {
      metrics.pattern_following.score = 0.75;
    } else if (metrics.pattern_following.word_accuracy_percentage >= 60) {
      metrics.pattern_following.score = 0.5;
    } else {
      metrics.pattern_following.score = 0.25;
    }

    metrics.reading_speed.wpm = enhancedMetrics.fluency.wpm;

    const { min, max } = metrics.reading_speed.ideal_range;
    if (metrics.reading_speed.wpm >= min && metrics.reading_speed.wpm <= max) {
      metrics.reading_speed.score = 1;
    } else if (
      metrics.reading_speed.wpm >= min * 0.8 &&
      metrics.reading_speed.wpm <= max * 1.2
    ) {
      metrics.reading_speed.score = 0.75;
    } else if (
      metrics.reading_speed.wpm >= min * 0.6 &&
      metrics.reading_speed.wpm <= max * 1.4
    ) {
      metrics.reading_speed.score = 0.5;
    } else {
      metrics.reading_speed.score = 0.25;
    }

    metrics.overall_score =
      metrics.passage_complete.score +
      metrics.attempt.score +
      metrics.pronunciation.score +
      metrics.pattern_following.score +
      metrics.reading_speed.score;

    metrics.percentage_score = Math.round((metrics.overall_score / 10) * 100);

    const feedback = generateDetailedFeedback(metrics, enhancedMetrics);

    const scoreData = {
      metrics,
      enhancedMetrics,
      totalScore: metrics.overall_score,
      percentageScore: metrics.percentage_score,
      feedback,
    };

    setDetailedScore(scoreData);
    setAccuracy(metrics.percentage_score);
    setFeedback(feedback.summary);

    if (
      !isPassageCompleted(selectedPassage.id) &&
      metrics.overall_score >= 4.5
    ) {
      saveAttempt(scoreData);
    } else {
      saveAttemptToHistory(scoreData);
    }
  };

  const calculateEnhancedMetrics = (
    originalText,
    userTranscript,
    startTime
  ) => {
    const recordingDuration = (Date.now() - startTime) / 1000;

    const cleanOriginal = originalText
      .toLowerCase()
      .replace(/[^\w\s.,!?;]/g, "");
    const cleanTranscript = userTranscript
      .toLowerCase()
      .replace(/[^\w\s.,!?;]/g, "");

    const originalWords = cleanOriginal.split(/\s+/);
    const transcriptWords = cleanTranscript.split(/\s+/);
    const originalChars = cleanOriginal.replace(/\s+/g, "").split("");
    const transcriptChars = cleanTranscript.replace(/\s+/g, "").split("");

    let metrics = {
      accuracy: {
        wer: 0,
        cer: 0,
        correctWords: 0,
        totalWords: originalWords.length,
        correctChars: 0,
        totalChars: originalChars.length,
        misspelledWords: [],
        levenshteinDistance: 0,
        bleuScore: 0,
        score: 0,
      },
      fluency: {
        wpm: 0,
        idealWpmRange: { min: 120, max: 150 },
        pausesCount: 0,
        expectedPauses: 0,
        fillerWords: 0,
        score: 0,
      },
      pronunciation: {
        phonemeErrorRate: 0,
        difficultWords: [],
        intonationScore: 0,
        score: 0,
      },
      completeness: {
        coverageRatio: 0,
        skippedWords: [],
        extraWords: [],
        score: 0,
      },
      prosody: {
        variationScore: 0,
        consistencyScore: 0,
        emotionAlignment: 0,
        score: 0,
      },
      rawData: {
        recordingDuration: recordingDuration,
        expectedDuration: originalWords.length * 0.5,
      },
    };

    const wordMatchResults = calculateWordMatches(
      originalWords,
      transcriptWords
    );
    metrics.accuracy.correctWords = wordMatchResults.correctCount;
    metrics.accuracy.misspelledWords = wordMatchResults.misspelledWords;

    const { distance, operations } = calculateLevenshteinWithOperations(
      originalWords,
      transcriptWords
    );
    metrics.accuracy.levenshteinDistance = distance;
    metrics.accuracy.wer = distance / originalWords.length;

    const substitutions = operations.filter((op) => op.type === "substitution");
    const insertions = operations.filter((op) => op.type === "insertion");
    const deletions = operations.filter((op) => op.type === "deletion");

    const charDistance = calculateLevenshteinDistance(
      cleanOriginal.replace(/\s+/g, ""),
      cleanTranscript.replace(/\s+/g, "")
    );
    metrics.accuracy.cer = charDistance / originalChars.length;
    metrics.accuracy.correctChars = originalChars.length - charDistance;

    metrics.accuracy.bleuScore = calculateSimplifiedBleu(
      cleanOriginal,
      cleanTranscript
    );

    const wordAccuracyPercent =
      metrics.accuracy.correctWords / metrics.accuracy.totalWords;
    const cerWeight = 1 - metrics.accuracy.cer;
    metrics.accuracy.score = Math.round(
      (wordAccuracyPercent * 0.7 + cerWeight * 0.3) * 30
    );

    const minutes = recordingDuration / 60;
    metrics.fluency.wpm = Math.round(transcriptWords.length / minutes);

    const punctuationMatches = originalText.match(/[.,!?;]/g);
    metrics.fluency.expectedPauses = punctuationMatches
      ? punctuationMatches.length
      : 0;

    const pauseEstimate = transcriptWords.length / 10;
    metrics.fluency.pausesCount = Math.min(
      metrics.fluency.expectedPauses,
      Math.floor(pauseEstimate)
    );

    const fillerWordRegex = /\b(um|uh|er|like|you know|hmm)\b/gi;
    const fillerMatches = userTranscript.match(fillerWordRegex) || [];
    metrics.fluency.fillerWords = fillerMatches.length;

    const wpmScore = calculateWpmScore(
      metrics.fluency.wpm,
      metrics.fluency.idealWpmRange
    );
    const pauseScore =
      metrics.fluency.pausesCount / Math.max(1, metrics.fluency.expectedPauses);
    const fillerPenalty = Math.min(10, metrics.fluency.fillerWords) / 10;

    metrics.fluency.score = Math.round(
      (wpmScore * 0.5 + pauseScore * 0.3 + (1 - fillerPenalty) * 0.2) * 30
    );

    const difficultWords = originalWords.filter(
      (word) => word.length > 7 || /[^a-zA-Z]/.test(word)
    );

    metrics.pronunciation.difficultWords = difficultWords.filter((word) =>
      metrics.accuracy.misspelledWords.some(
        (misspelled) =>
          misspelled.original &&
          misspelled.original.toLowerCase() === word.toLowerCase()
      )
    );

    metrics.pronunciation.phonemeErrorRate =
      metrics.pronunciation.difficultWords.length /
      Math.max(1, difficultWords.length);

    metrics.pronunciation.intonationScore = pauseScore * 10;

    const difficultyScore = 1 - metrics.pronunciation.phonemeErrorRate;
    metrics.pronunciation.score = Math.round(
      (difficultyScore * 0.7 +
        (metrics.pronunciation.intonationScore / 10) * 0.3) *
        20
    );

    metrics.completeness.coverageRatio =
      transcriptWords.length / originalWords.length;

    metrics.completeness.skippedWords = findSkippedWords(
      originalWords,
      transcriptWords
    );

    metrics.completeness.extraWords = findExtraWords(
      originalWords,
      transcriptWords
    );

    const coverageScore = Math.min(1, metrics.completeness.coverageRatio);
    const skippedPenalty = Math.min(
      1,
      metrics.completeness.skippedWords.length / 10
    );
    const extraPenalty = Math.min(
      1,
      metrics.completeness.extraWords.length / 10
    );

    metrics.completeness.score = Math.round(
      (coverageScore * 0.6 +
        (1 - skippedPenalty) * 0.3 +
        (1 - extraPenalty) * 0.1) *
        10
    );

    metrics.prosody.variationScore = Math.min(
      10,
      Math.round(metrics.fluency.score / 3)
    );
    metrics.prosody.consistencyScore = Math.min(
      5,
      Math.round(metrics.accuracy.score / 6)
    );
    metrics.prosody.emotionAlignment = 5;

    metrics.prosody.score =
      Math.round(
        (metrics.prosody.variationScore / 10) * 0.5 +
          (metrics.prosody.consistencyScore / 5) * 0.3 +
          (metrics.prosody.emotionAlignment / 10) * 0.2
      ) * 10;

    return metrics;
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

  const calculateLevenshteinWithOperations = (a, b) => {
    if (!Array.isArray(a)) {
      a = a.split(/\s+/);
    }
    if (!Array.isArray(b)) {
      b = b.split(/\s+/);
    }

    const matrix = [];
    const operations = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          const substitutionCost = matrix[i - 1][j - 1] + 1;
          const insertionCost = matrix[i][j - 1] + 1;
          const deletionCost = matrix[i - 1][j] + 1;

          matrix[i][j] = Math.min(
            substitutionCost,
            insertionCost,
            deletionCost
          );

          if (matrix[i][j] === substitutionCost) {
            operations.push({
              type: "substitution",
              expected: a[j - 1],
              actual: b[i - 1],
              position: j - 1,
            });
          } else if (matrix[i][j] === insertionCost) {
            operations.push({
              type: "insertion",
              actual: b[i - 1],
              position: j - 1,
            });
          } else if (matrix[i][j] === deletionCost) {
            operations.push({
              type: "deletion",
              expected: a[j - 1],
              position: j - 1,
            });
          }
        }
      }
    }

    const uniqueOperations = [];
    const positions = new Set();

    operations.forEach((op) => {
      const posKey = `${op.type}-${op.position}`;
      if (!positions.has(posKey)) {
        positions.add(posKey);
        uniqueOperations.push(op);
      }
    });

    return {
      distance: matrix[b.length][a.length],
      operations: uniqueOperations,
    };
  };

  const calculateWordMatches = (originalWords, transcriptWords) => {
    let correctCount = 0;
    const misspelledWords = [];

    const matchedIndices = new Set();

    for (
      let i = 0;
      i < Math.min(originalWords.length, transcriptWords.length);
      i++
    ) {
      const orig = originalWords[i].replace(/[.,!?;]/g, "").toLowerCase();
      const trans = transcriptWords[i].replace(/[.,!?;]/g, "").toLowerCase();

      if (orig === trans) {
        correctCount++;
        matchedIndices.add(i);
      } else {
        if (calculateLevenshteinDistance(orig, trans) <= 2) {
          correctCount += 0.5;
          misspelledWords.push({
            original: orig,
            transcribed: trans,
            position: i,
            nearMatch: true,
          });
        } else {
          misspelledWords.push({
            original: orig,
            transcribed: trans,
            position: i,
            nearMatch: false,
          });
        }
      }
    }

    for (let i = transcriptWords.length; i < originalWords.length; i++) {
      misspelledWords.push({
        original: originalWords[i].replace(/[.,!?;]/g, ""),
        transcribed: "",
        position: i,
        missing: true,
      });
    }

    return { correctCount, misspelledWords };
  };

  const calculateSimplifiedBleu = (reference, candidate) => {
    const refWords = reference.split(/\s+/);
    const candWords = candidate.split(/\s+/);

    let matches = 0;
    for (const word of candWords) {
      if (refWords.includes(word)) {
        matches++;
      }
    }

    const precision = matches / Math.max(1, candWords.length);

    const brevityPenalty = Math.exp(
      1 - refWords.length / Math.max(1, candWords.length)
    );

    return Math.min(1, precision * brevityPenalty);
  };

  const calculateWpmScore = (wpm, idealRange) => {
    const { min, max } = idealRange;

    if (wpm >= min && wpm <= max) {
      return 1;
    } else if (wpm < min) {
      return Math.max(0, 1 - (min - wpm) / min);
    } else {
      return Math.max(0, 1 - (wpm - max) / max);
    }
  };

  const findSkippedWords = (originalWords, transcriptWords) => {
    const skipped = [];

    const transcriptSet = new Set(
      transcriptWords.map((w) => w.toLowerCase().replace(/[.,!?;]/g, ""))
    );

    originalWords.forEach((word, index) => {
      const cleaned = word.toLowerCase().replace(/[.,!?;]/g, "");
      if (!transcriptSet.has(cleaned) && cleaned.length > 2) {
        skipped.push({ word: cleaned, position: index });
      }
    });

    return skipped;
  };

  const findExtraWords = (originalWords, transcriptWords) => {
    const extra = [];

    const originalSet = new Set(
      originalWords.map((w) => w.toLowerCase().replace(/[.,!?;]/g, ""))
    );

    transcriptWords.forEach((word, index) => {
      const cleaned = word.toLowerCase().replace(/[.,!?;]/g, "");
      if (!originalSet.has(cleaned) && cleaned.length > 2) {
        extra.push({ word: cleaned, position: index });
      }
    });

    return extra;
  };

  const generateDetailedFeedback = (metrics, enhancedMetrics) => {
    const feedback = {
      summary: "",
      strengths: [],
      improvements: [],
    };

    const totalScore = metrics.overall_score;
    if (totalScore >= 8) {
      feedback.summary =
        "Excellent! Your reading is very accurate, well-paced, and complete.";
    } else if (totalScore >= 6) {
      feedback.summary =
        "Very good reading! You have strong skills with just a few areas to improve.";
    } else if (totalScore >= 4.5) {
      feedback.summary =
        "Good job! Your reading shows progress with some areas for improvement.";
    } else if (totalScore >= 3) {
      feedback.summary =
        "You're making progress. Focus on completing the entire passage and accurate pronunciation.";
    } else {
      feedback.summary =
        "Keep practicing! Try to complete more of the passage and focus on accuracy.";
    }

    if (metrics.passage_complete.score >= 4.5) {
      feedback.strengths.push("You completed the full passage correctly");
    }

    if (metrics.pronunciation.score >= 0.75) {
      feedback.strengths.push("Good pronunciation with few or no errors");
    }

    if (metrics.pattern_following.score >= 0.75) {
      feedback.strengths.push("Excellent adherence to the passage text");
    }

    if (metrics.reading_speed.score >= 0.75) {
      feedback.strengths.push("Well-paced reading speed");
    }

    if (metrics.passage_complete.score < 4.5) {
      if (!metrics.passage_complete.completed) {
        feedback.improvements.push("Try to complete the entire passage");
      }
      if (!metrics.passage_complete.within_time_limit) {
        feedback.improvements.push(
          "Work on completing the passage within the 2-minute time limit"
        );
      }
    }

    if (metrics.pronunciation.score < 0.75) {
      const examples = metrics.pronunciation.mispronounced_words
        .slice(0, 3)
        .join(", ");
      feedback.improvements.push(
        `Practice pronouncing challenging words like: ${examples}`
      );
    }

    if (metrics.pattern_following.score < 0.75) {
      feedback.improvements.push(
        "Focus on reading the exact words from the passage"
      );
    }

    if (metrics.reading_speed.score < 0.75) {
      const { wpm, ideal_range } = metrics.reading_speed;
      if (wpm < ideal_range.min) {
        feedback.improvements.push(
          `Try to increase your reading speed (currently ${wpm} WPM)`
        );
      } else if (wpm > ideal_range.max) {
        feedback.improvements.push(
          `Try to slow down your reading pace (currently ${wpm} WPM)`
        );
      }
    }

    return feedback;
  };

  const calculateOverallScore = (metrics) => {
    return Math.round(
      (metrics.accuracy.score / 30) * 35 +
        (metrics.fluency.score / 30) * 30 +
        (metrics.pronunciation.score / 20) * 15 +
        (metrics.completeness.score / 10) * 10 +
        (metrics.prosody.score / 10) * 10
    );
  };

  const saveAttempt = async (scoreData) => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setFeedback("User not logged in");
        return;
      }

      const attemptData = {
        timestamp: new Date().toISOString(),
        passage_complete: scoreData.metrics.passage_complete.completed,
        within_time_limit: scoreData.metrics.passage_complete.within_time_limit,
        wpm: scoreData.metrics.reading_speed.wpm,
        attempt_score: scoreData.metrics.attempt.score,
        pronunciation_score: scoreData.metrics.pronunciation.score,
        pattern_following_score: scoreData.metrics.pattern_following.score,
        wpm_score: scoreData.metrics.reading_speed.score,
        missed_words: scoreData.metrics.pronunciation.mispronounced_words,
        overall_score: scoreData.metrics.overall_score,
        percentage_score: scoreData.metrics.percentage_score,
        transcript: transcript,
        recording_duration: scoreData.metrics.raw_data.recording_duration,
        feedback: scoreData.feedback,
      };

      const payload = {
        passageId: selectedPassage.id,
        title: selectedPassage.title,
        attemptData: attemptData,
        isFirstCompletion: !completedPassages.includes(selectedPassage.id),
      };

      await progressService.saveReadingAttempt(userId, payload);

      if (
        !completedPassages.includes(selectedPassage.id) &&
        scoreData.metrics.overall_score >= 4.5
      ) {
        const updatedCompletedPassages = [
          ...completedPassages,
          selectedPassage.id,
        ];
        setCompletedPassages(updatedCompletedPassages);
        localStorage.setItem(
          "completed_reading_passages",
          JSON.stringify(updatedCompletedPassages)
        );
      }

      await loadAttemptHistory(selectedPassage.id);
    } catch (error) {
      console.error("Error saving attempt:", error);
      setFeedback("Failed to save attempt.");
    }
  };

  const saveAttemptToHistory = async (scoreData) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setFeedback("User not logged in");
      return;
    }

    const attemptData = {
      timestamp: new Date().toISOString(),
      passage_complete: scoreData.metrics.passage_complete.completed,
      within_time_limit: scoreData.metrics.passage_complete.within_time_limit,
      wpm: scoreData.metrics.reading_speed.wpm,
      attempt_score: scoreData.metrics.attempt.score,
      pronunciation_score: scoreData.metrics.pronunciation.score,
      pattern_following_score: scoreData.metrics.pattern_following.score,
      wpm_score: scoreData.metrics.reading_speed.score,
      missed_words: scoreData.metrics.pronunciation.mispronounced_words,
      overall_score: scoreData.metrics.overall_score,
      percentage_score: scoreData.metrics.percentage_score,
      transcript: transcript,
      recording_duration: scoreData.metrics.raw_data.recording_duration,
      feedback: scoreData.feedback,
    };

    const payload = {
      passageId: selectedPassage.id,
      title: selectedPassage.title,
      attemptData: attemptData,
      isFirstCompletion: false,
    };

    try {
      await progressService.saveReadingAttempt(userId, payload);
      await loadAttemptHistory(selectedPassage.id);
    } catch (error) {
      console.error("Error saving attempt to history:", error);
      setFeedback("Failed to save attempt to history.");
    }
  };

  const EnhancedAttemptHistory = () => {
    if (attemptHistory.length === 0) return null;

    const limitedAttempts = attemptHistory.slice(0, 3);

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };

    const handleAttemptSelect = (index) => {
      setSelectedAttemptIndex(index);
      const selectedAttempt = limitedAttempts[index];
      const compatibleScoreData = {
        metrics: selectedAttempt,
        totalScore: selectedAttempt.overall_score,
        percentageScore: selectedAttempt.percentage_score,
        feedback: selectedAttempt.feedback,
      };
      setDetailedScore(compatibleScoreData);
      setAccuracy(selectedAttempt.percentage_score);
      setFeedback(selectedAttempt.feedback?.summary || "");
      setTranscript(selectedAttempt.transcript || "");
    };
  };

  const EnhancedScoreBreakdown = ({ scoreData }) => {
    if (!scoreData || !scoreData.metrics) return null;

    const { metrics } = scoreData;

    const getScoreColor = (score, max) => {
      const ratio = score / max;
      if (ratio >= 0.8) return "#4caf50";
      if (ratio >= 0.5) return "#ff9800";
      return "#f44336";
    };

    return (
      <div className="reading-enhanced-score-breakdown">
        <div className="reading-score-header">
          <h3>Score Breakdown</h3>
          <div className="reading-total-score">
            <div className="reading-score-circle">
              <span className="reading-score-number">
                {Math.round(metrics.overall_score)}
              </span>
              <span className="reading-score-max">/10</span>
            </div>
            <div className="reading-score-percentage">
              {metrics.percentage_score}%
            </div>
          </div>
        </div>

        <div className="reading-new-score-categories">
          <div className="reading-score-category">
            <div className="reading-category-header">
              <h4>Passage Completion</h4>
              <div className="reading-category-score">
                {metrics.passage_complete.score}/5
              </div>
            </div>
            <div className="reading-score-bar-container">
              <div
                className="reading-score-bar"
                style={{
                  width: `${(metrics.passage_complete.score / 5) * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.passage_complete.score,
                    5
                  ),
                }}
              ></div>
            </div>
            <div className="reading-category-details">
              <div className="reading-detail-item">
                <span className="reading-detail-label">Completed</span>
                <span className="reading-detail-value">
                  {metrics.passage_complete.completed ? (
                    <span className="reading-detail-check">✓</span>
                  ) : (
                    <span className="reading-detail-x">✗</span>
                  )}
                </span>
              </div>
              <div className="reading-detail-item">
                <span className="reading-detail-label">Within Time</span>
                <span className="reading-detail-value">
                  {metrics.passage_complete.within_time_limit ? (
                    <span className="reading-detail-check">✓</span>
                  ) : (
                    <span className="reading-detail-x">✗</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="reading-score-category">
            <div className="reading-category-header">
              <h4>Pronunciation</h4>
              <div className="reading-category-score">
                {metrics.pronunciation.score}/1
              </div>
            </div>
            <div className="reading-score-bar-container">
              <div
                className="reading-score-bar"
                style={{
                  width: `${metrics.pronunciation.score * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.pronunciation.score,
                    1
                  ),
                }}
              ></div>
            </div>
            <div className="reading-category-details">
              <div className="reading-detail-item">
                <span className="reading-detail-label">
                  Mispronounced Words
                </span>
                <span className="reading-detail-value">
                  {metrics.pronunciation.mispronounced_words.length}
                </span>
              </div>
            </div>
          </div>

          <div className="reading-score-category">
            <div className="reading-category-header">
              <h4>Accuracy</h4>
              <div className="reading-category-score">
                {metrics.pattern_following.score}/1
              </div>
            </div>
            <div className="reading-score-bar-container">
              <div
                className="reading-score-bar"
                style={{
                  width: `${metrics.pattern_following.word_accuracy_percentage}%`,
                  backgroundColor: getScoreColor(
                    metrics.pattern_following.score,
                    1
                  ),
                }}
              ></div>
            </div>
          </div>

          <div className="reading-score-category">
            <div className="reading-category-header">
              <h4>Reading Speed</h4>
              <div className="reading-category-score">
                {metrics.reading_speed.score}/1
              </div>
            </div>
            <div className="reading-score-bar-container">
              <div
                className="reading-score-bar"
                style={{
                  width: `${metrics.reading_speed.score * 100}%`,
                  backgroundColor: getScoreColor(
                    metrics.reading_speed.score,
                    1
                  ),
                }}
              ></div>
            </div>
            <div className="reading-category-details">
              <div className="reading-detail-item">
                <span className="reading-detail-label">Words per Minute</span>
                <span className="reading-detail-value">
                  {metrics.reading_speed.wpm}
                </span>
              </div>
            </div>
          </div>
        </div>

        {metrics.feedback && (
          <div className="reading-enhanced-feedback-section">
            <h4>Feedback</h4>
            <p className="reading-feedback-summary">
              {metrics.feedback.summary}
            </p>

            {metrics.feedback.strengths?.length > 0 && (
              <div className="reading-feedback-strengths">
                <h5>Strengths:</h5>
                <ul>
                  {metrics.feedback.strengths.map((strength, index) => (
                    <li key={`strength-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {metrics.feedback.improvements?.length > 0 && (
              <div className="reading-feedback-improvements">
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

  const handleBackToList = () => {
    setSelectedPassage(null);
    setTranscript("");
    transcriptBufferRef.current = "";
    setAccuracy(null);
    setTimeRemaining(150);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="reading-container">
      {autoSubmitted && accuracy !== null && (
        <div className="reading-auto-submitted-notice">
          <span className="info-icon">ℹ️</span>
          Time expired - your reading was automatically submitted.
        </div>
      )}
      {/* Instead of using the overall loading state, we now show the spinner only until static passages load */}
      {(!passagesLoaded) && (
        <div className="reading-loading">
          <div className="reading-spinner"></div>
          <p>Loading reading exercises...</p>
        </div>
      )}
      {error && (
        <div className="reading-error">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="reading-clear-error"
          >
            Dismiss
          </button>
        </div>
      )}
      {passagesLoaded && (
        <>
          <div className="reading-header">
            <div className="ReadingSection-infoSection">
              <h1>Reading Training</h1>
              <p>
                Enhance your reading skills with our curated passages and
                receive personalized feedback on your pronunciation, fluency,
                and accuracy.
              </p>
              <p>You are allowed up to three attempts per passage.</p>
              <p>
                Consistent practice will help you earn higher rankings and
                achieve mastery.
              </p>
            </div>

            <div className="reading-progress">
              <h3>
                Module Progress 
                {/* ({Math.round(calculateCompletionPercentage())}%) */}
              </h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />

              {completedPassages.length >= Math.ceil(passages.length * 0.5) ? (
                <div className="reading-progress-message success">
                  <span className="reading-checkmark">✓</span>
                  Congratulations! You have completed the Reading module!
                </div>
              ) : (
                <div className="reading-progress-message">
                  Complete{" "}
                  {Math.ceil(passages.length * 0.5) - completedPassages.length}{" "}
                  more passage(s) to complete this module.
                </div>
              )}
            </div>
          </div>

          {selectedPassage ? (
            <div className="reading-practice">
              <div className="reading-passage-header">
                <h2>{selectedPassage.title}</h2>
                <button
                  className="reading-back-button"
                  onClick={handleBackToList}
                  disabled={isRecording}
                >
                  ← Back to passages
                </button>
              </div>

              <div className="reading-passage-content">
                <div className="reading-passage-text-container">
                  <h3>Reading Passage:</h3>
                  <div className="reading-passage-text">
                    <p>{selectedPassage.text}</p>
                  </div>
                </div>

                <div className="reading-controls">
                  <div className="reading-control-buttons">
                    <button
                      className={`reading-start-button ${
                        isRecording ? "recording" : ""
                      }`}
                      onClick={startRecording}
                      disabled={isRecording}
                    >
                      {isRecording ? "Recording..." : "Start Recording"}
                    </button>
                    <button
                      className="reading-stop-button"
                      onClick={stopRecording}
                      disabled={!isRecording}
                    >
                      Stop Recording
                    </button>
                  </div>

                  <div className="reading-timer-display">
                    <div
                      className={`reading-timer-value ${
                        timeRemaining < 30 ? "timer-warning" : ""
                      }`}
                    >
                      {formatTime(timeRemaining)}
                    </div>
                    <div className="reading-timer-label">Time Remaining</div>
                  </div>

                  {isRecording && (
                    <div className="reading-recording-status">
                      <div className="reading-recording-indicator"></div>
                      <p>Recording in progress... Speak clearly</p>
                    </div>
                  )}
                </div>

                {transcript && !isRecording && (
                  <div className="reading-transcript-container">
                    <h3>Your Reading:</h3>
                    <p className="reading-transcript-text">{transcript}</p>
                    <div className="reading-word-count">
                      Word count:{" "}
                      {
                        transcript
                          .split(/\s+/)
                          .filter((w) => w.trim().length > 0).length
                      }
                    </div>
                  </div>
                )}

                {transcript && !isRecording && detailedScore && (
                  <TranscriptComparison
                    originalText={selectedPassage.text}
                    userTranscript={transcript}
                    metrics={detailedScore.enhancedMetrics}
                  />
                )}

                {accuracy !== null && (
                  <div className="reading-results-container">
                    <div className="reading-accuracy-container">
                      <h3>Reading Score: {accuracy}%</h3>
                      <div className="reading-accuracy-meter">
                        <div
                          className="reading-accuracy-bar"
                          style={{
                            width: `${accuracy}%`,
                            backgroundColor:
                              accuracy >= 80
                                ? "#4caf50"
                                : accuracy >= 60
                                ? "#ff9800"
                                : "#f44336",
                          }}
                        ></div>
                      </div>
                    </div>

                    {feedback && (
                      <div className="reading-feedback-container">
                        <h3>Feedback</h3>
                        <p className="reading-feedback-text">{feedback}</p>
                      </div>
                    )}

                    {detailedScore && (
                      <EnhancedScoreBreakdown scoreData={detailedScore} />
                    )}

                    {accuracy >= 60 &&
                      !isPassageCompleted(selectedPassage.id) && (
                        <div className="reading-completion-notification">
                          <span className="reading-checkmark">✓</span>
                          Congratulations! This passage has been marked as
                          completed.
                        </div>
                      )}
                  </div>
                )}

                {attemptHistory.length > 0 && (
                  <div className="reading-history-section">
                    <EnhancedAttemptHistory />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="reading-passage-selection">
              <h2>Select a Passage</h2>
              <div className="reading-cards-grid">
                {passages.map((passage) => (
                  <div
                    key={passage.id}
                    className={`reading-card ${
                      isPassageCompleted(passage.id) ? "completed" : ""
                    }`}
                    onClick={() => selectPassage(passage)}
                  >
                    <h3>
                      {passage.title}
                      {isPassageCompleted(passage.id) && (
                        <span className="reading-card-checkmark">✓</span>
                      )}
                    </h3>
                    <div className="reading-card-content">
                      <p>{passage.text.substring(0, 100)}...</p>
                    </div>
                    <div className="reading-card-footer">
                      <span className="reading-card-level">
                        Level {passage.level || "Beginner"}
                      </span>
                      {isPassageCompleted(passage.id) && (
                        <span className="reading-card-completed">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Show a progress loading message if progress data is still loading */}
              {!progressLoaded && (
                <div className="progress-loading">
                  <p>Loading progress data...</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReadingTraining;
