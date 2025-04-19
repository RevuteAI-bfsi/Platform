import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ProgressBar from "../../CoursePlatform/common/ProgressBar";
import progressService from "../../services/progressService";
import textToSpeechService from "../../services/TextToSpeechService";
import { determineSkillType } from "../utils/skillTypeUtils";
import "../../CoursePlatform/TrainingComponent/TrainingStyles.css";
import "./SalesSpeakingStyles.css";
import geminiService from "../../Services/Geminiservice";
import standardAnswers from "../training/sales/salesSpeakingStandardAnswers.json";

const fallbackSalesSpeakingQuestions = [
  {
    id: "sales-q1",
    question:
      "Introduce yourself and explain your role as a sales representative.",
    level: "Beginner",
  },
  {
    id: "sales-q2",
    question:
      "How would you pitch our banking services to a potential customer?",
    level: "Intermediate",
  },
  {
    id: "sales-q3",
    question:
      "A customer objects that our interest rates are too high. How would you respond?",
    level: "Advanced",
  },
];

const SalesSpeakingTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState([]);
  const [viewMode, setViewMode] = useState("overview");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const userId = localStorage.getItem("userId");
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [maxPlaysReached, setMaxPlaysReached] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
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
const [currentLevel, setCurrentLevel] = useState("Beginner");


  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  const skillType = determineSkillType(location.pathname);
  const allowRestartRef = useRef(false);


  // Load the questions (static content) via dynamic import
  useEffect(() => {
    try {
      console.log("Initializing SalesSpeakingTraining component...");

      // Dynamically import questions JSON
      import("../training/sales/salesSpeakingQuestions.json")
        .then((importedQuestions) => {
          console.log(
            "Successfully loaded sales speaking questions:",
            importedQuestions.default
          );
          if (
            Array.isArray(importedQuestions.default) &&
            importedQuestions.default.length > 0
          ) {
            setQuestions(importedQuestions.default);
          } else {
            console.warn(
              "Imported sales speaking questions have invalid format, using fallback"
            );
            setQuestions(fallbackSalesSpeakingQuestions);
          }
          // Mark both content and questions as loaded
          setContentLoaded(true);
          setQuestionsLoaded(true);
        })
        .catch((err) => {
          console.error("Error importing sales speaking questions:", err);
          console.log("Using fallback questions instead");
          setQuestions(fallbackSalesSpeakingQuestions);
          setContentLoaded(true);
          setQuestionsLoaded(true);
        });
    } catch (err) {
      console.error("Error in setup:", err);
      setError("Failed to initialize training. Please try again.");
      setQuestions(fallbackSalesSpeakingQuestions);
      setContentLoaded(true);
      setQuestionsLoaded(true);
    }
  }, []);

  const getLearningTopics = useCallback(() => {
    if (skillType === "sales") {
      return [
        "introduction",
        "telecalling",
        "skills-needed",
        "telecalling-module",
      ];
    } else {
      return [];
    }
  }, [skillType]);

  // Check progress and learning completion (dynamic data)
  useEffect(() => {
    const checkLearningCompletion = async () => {
      try {
        // Removed setLoading(true); using progressLoaded instead
        if (!userId) {
          setError("User not logged in");
          navigate("/login");
          return;
        }

        console.log(
          `Checking learning completion for user ${userId}, skillType ${skillType}`
        );

        const completedTopicsFromStorage = JSON.parse(
          localStorage.getItem(`${skillType}_completed`) || "[]"
        );

        const learningTopics = getLearningTopics();

        const allCompletedInStorage = learningTopics.every((topic) =>
          completedTopicsFromStorage.includes(topic)
        );

        console.log(
          `Learning completion status from localStorage: ${allCompletedInStorage}`
        );

        let allLearningCompleted = allCompletedInStorage;

        if (!allCompletedInStorage) {
          const userProgress = await progressService.getUserProgress(userId);
          const learningProgress =
            userProgress.learningProgress[skillType] || {};

          allLearningCompleted = learningTopics.every(
            (topic) =>
              learningProgress[topic] && learningProgress[topic].completed
          );

          console.log(
            `All ${skillType} learning topics completed? ${allLearningCompleted}`
          );

          if (allLearningCompleted) {
            localStorage.setItem(
              `${skillType}_completed`,
              JSON.stringify(learningTopics)
            );
          }
        }

        setLearningCompleted(allLearningCompleted);

        if (
          !allLearningCompleted &&
          !window.location.pathname.includes("/training/speaking")
        ) {
          console.log(
            `Not all learning topics completed, redirecting to learning page`
          );
          navigate(`/${skillType}/learning/${learningTopics[0]}`);
          return;
        }

        await loadCompletedQuestions();
        await loadAttemptHistory();
        // Mark progress as loaded once done
        setProgressLoaded(true);
      } catch (err) {
        console.error("Error checking completion:", err);
        setError("Failed to load progress data. Please try again.");
        setProgressLoaded(true);
      }
    };

    const initSpeechRecognition = () => {
      if (
        "SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window
      ) {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

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
            finalTranscriptRef.current += " " + finalTranscriptSegment;
            setTranscript(finalTranscriptRef.current.trim());
          } else if (interimTranscript) {
            setTranscript(finalTranscriptRef.current + " " + interimTranscript);
          }
        };

        recognitionRef.current.onend = () => {
          if (allowRestartRef.current) {
            // only restart if we're still in a recording session
            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.error("Error restarting recognition:", err);
              }
            }, 200);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech") {
            stopRecording();
          }
        };
      } else {
        setError(
          "Speech recognition is not supported in your browser. Please try Chrome or Edge."
        );
      }
    };

    if (contentLoaded) {
      checkLearningCompletion();
      initSpeechRecognition();
      textToSpeechService.resetPlayCount();
    }

    return () => {
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Recognition already stopped");
        }
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      textToSpeechService.cancel();
    };
  }, [
    contentLoaded,
    navigate,
    userId,
    skillType,
    getLearningTopics,
    isRecording,
  ]);

  const loadCompletedQuestions = async () => {
    try {
      if (!userId) return;

      console.log(`Loading completed questions for user ${userId}`);

      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};

      let completed = [];

      if (
        trainingProgress.salesSpeaking &&
        typeof trainingProgress.salesSpeaking === "object"
      ) {
        completed = Object.keys(trainingProgress.salesSpeaking);
      } else {
        const speakingAttempts = trainingProgress.speaking || [];
        completed = speakingAttempts
          .filter(
            (attempt) => attempt.topicId && attempt.topicId.startsWith("sales-")
          )
          .map((result) => result.topicId);
      }

      console.log(
        `Found ${completed.length} completed sales speaking questions`
      );

      setCompletedQuestions(completed);
    } catch (error) {
      console.error("Error loading completed questions:", error);
      setError("Failed to load completed questions. Please try again.");
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

      if (
        trainingProgress.salesSpeaking &&
        typeof trainingProgress.salesSpeaking === "object"
      ) {
        const salesQuestions = Object.keys(trainingProgress.salesSpeaking);
        const allAttempts = [];
        let highestScore = 0;

        salesQuestions.forEach((questionId) => {
          const questionData = trainingProgress.salesSpeaking[questionId];
          if (
            questionData &&
            questionData.metrics &&
            Array.isArray(questionData.metrics)
          ) {
            questionData.metrics.forEach((metric) => {
              const attemptData = {
                topicId: questionId,
                title: questionData.question,
                score: metric.percentage_score,
                transcript: metric.transcript,
                metrics: metric,
                date: metric.timestamp,
              };

              allAttempts.push(attemptData);

              if (metric.percentage_score > highestScore) {
                highestScore = metric.percentage_score;
                bestAttemptData = attemptData;
              }
            });
          }
        });

        attempts = allAttempts;
      } else {
        const speakingAttempts = trainingProgress.speaking || [];
        attempts = speakingAttempts.filter(
          (attempt) => attempt.topicId && attempt.topicId.startsWith("sales-")
        );

        if (attempts.length > 0) {
          bestAttemptData = attempts.reduce((best, current) =>
            current.score > best.score ? current : best
          );
        }
      }

      setAttemptHistory(attempts);
      setBestAttempt(bestAttemptData);
    } catch (error) {
      console.error("Error loading attempt history:", error);
    }
  };

  const calculateCompletionPercentage = () => {
    if (!questions || !questions.length) return 0;
    return (completedQuestions.length / questions.length) * 100;
  };

  const isQuestionCompleted = (questionId) =>
    completedQuestions.includes(questionId);

  const selectQuestion = (question) => {
    setSelectedQuestion(question);
    setTranscript("");
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);
    setSelectedAttemptIndex(null);
    textToSpeechService.resetPlayCount();
    setViewMode("question");
    loadQuestionAttempts(question.id);
  };

  const loadQuestionAttempts = async (questionId) => {
    try {
      if (!userId) return;

      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};

      if (
        trainingProgress.salesSpeaking &&
        typeof trainingProgress.salesSpeaking === "object"
      ) {
        const questionData = trainingProgress.salesSpeaking[questionId];
        if (
          questionData &&
          questionData.metrics &&
          Array.isArray(questionData.metrics)
        ) {
          setAttemptHistory(questionData.metrics);

          if (questionData.metrics.length > 0) {
            const bestAttempt = questionData.metrics.reduce((best, current) =>
              current.overall_score > best.overall_score ? current : best
            );
            setBestAttempt(bestAttempt);
          }
        } else {
          setAttemptHistory([]);
          setBestAttempt(null);
        }
      } else {
        const speakingAttempts = trainingProgress.speaking || [];
        const history = speakingAttempts.filter(
          (result) => result.topicId === questionId
        );
        setAttemptHistory(history);
        setBestAttempt(null);
      }
    } catch (error) {
      console.error("Error loading question attempts:", error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const TimerDisplay = () => {
    if (!isRecording) return null;

    return (
      <div className="timer-display">
        <div className={`timer-value ${timeLeft < 30 ? "timer-warning" : ""}`}>
          {formatTime(timeLeft)}
        </div>
        <div className="timer-label">Time Remaining</div>
      </div>
    );
  };

  const handlePlayAudio = async () => {
    if (!selectedQuestion) {
      setError("No question selected. Please select a question first.");
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
          selectedQuestion.question
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

  const startRecording = () => {
    if (!selectedQuestion) {
      setError("No question selected. Please select a question first.");
      return;
    }

    if (recognitionRef.current) {
      setTranscript("");
      finalTranscriptRef.current = "";
      setFeedback(null);
      setDetailedScore(null);
      setIsRecording(true);
      setRecordingStartTime(Date.now());

      // Set timer for 2 minutes (120 seconds)
      setTimeLeft(120);
      setTimerActive(true);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current);
            stopRecording(); // Auto-submit when time runs out
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      allowRestartRef.current = true; // Allow restarting recognition
      setIsRecording(true);

      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Recognition was not running");
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
      setError(
        "Speech recognition is not supported in your browser. Please try Chrome or Edge."
      );
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current || !isRecording) return;
  
    // prevent any auto-restarts
    allowRestartRef.current = false;
  
    // actually stop
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn("Recognition already stopped");
    }
  
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);
    setTimerActive(false);
  
    // grab final transcript & analyze
    const finalText = finalTranscriptRef.current.trim();
    setTranscript(finalText);
    if (finalText) analyzeResponse(finalText);
  };

  const analyzeResponse = async () => {
    if (!selectedQuestion) {
      setError("No question selected. Please select a question first.");
      return;
    }

    try {
      // 1. Compute recording duration and word count
      const recordingDuration = (Date.now() - recordingStartTime) / 1000;
      const words = transcript.split(/\s+/).filter((w) => w.trim().length > 0);
      const wordCount = words.length;

      // 2. Initialize all the metrics
      const metrics = {
        speaking_duration: {
          duration_seconds: recordingDuration,
          minimum_required: 30,
          score: 0,
        },
        attempt: {
          made: true,
          score: 1,
        },
        pronunciation: {
          mispronounced_words: [],
          mispronunciation_count: 0,
          score: 0,
        },
        sentence_framing: {
          quality_score: 0,
          score: 0,
        },
        punctuation: {
          punctuation_count: 0,
          expected_count: 0,
          score: 0,
        },
        relevance: {
          relevanceScore: 0,
          keyWords: [],
        },
        raw_data: {
          recording_duration: recordingDuration,
          expected_duration: 120,
          transcript,
          question_text: selectedQuestion.question,
        },
        overall_score: 0,
        percentage_score: 0,
      };

      // 3. Apply your existing scoring logic
      // Speaking duration (out of 5)
      metrics.speaking_duration.score =
        recordingDuration >= 30 ? 5 : Math.round((recordingDuration / 30) * 5);

      // Pronunciation (complex‑word ratio)
      const complexWords = words.filter((w) => w.length > 6);
      const complexWordRatio = complexWords.length / Math.max(1, wordCount);
      metrics.pronunciation.score = Math.min(1, complexWordRatio * 3);

      // Sentence framing
      const sentenceCount = (transcript.match(/[.!?]+/g) || []).length;
      const estimatedSentenceCount = Math.max(1, Math.floor(wordCount / 10));
      metrics.sentence_framing.quality_score = sentenceCount;
      metrics.sentence_framing.score = sentenceCount
        ? Math.min(1, sentenceCount / estimatedSentenceCount)
        : 0.5;

      // Punctuation
      const punctuationCount = (transcript.match(/[.!?,;:]+/g) || []).length;
      const expectedPunctuationCount = Math.max(1, Math.floor(wordCount / 12));
      metrics.punctuation.punctuation_count = punctuationCount;
      metrics.punctuation.expected_count = expectedPunctuationCount;
      metrics.punctuation.score = punctuationCount
        ? Math.min(1, punctuationCount / expectedPunctuationCount)
        : 0;

      // Relevance (reuse your existing helper)
      metrics.relevance.relevanceScore = assessRelevance(
        selectedQuestion.question,
        transcript
      );

      // Overall / percentage
      metrics.overall_score =
        metrics.speaking_duration.score +
        metrics.attempt.score +
        metrics.pronunciation.score +
        metrics.sentence_framing.score +
        metrics.punctuation.score;
      metrics.percentage_score = Math.round((metrics.overall_score / 9) * 100);

      const rawId = selectedQuestion.id;
      const numericId =
        typeof rawId === "number"
          ? rawId
          : parseInt(rawId.replace(/\D/g, ""), 10);
      const {
        standardAnswer: { expectedPoints },
      } = standardAnswers.find((q) => q.id === numericId);

      // 5. Show a placeholder while Gemini is running
      setFeedback({
        text: "Generating feedback…",
        strengths: [],
        improvements: [],
      });

      // 6. Call Gemini to evaluate transcript vs. the standard answer
      const aiResult = await geminiService.evaluateAgainstStandard({
        questionText: selectedQuestion.question,
        transcript,
        expectedPoints,
      });

      const { matchedPoints, missingPoints, accuracy, feedbackSummary } =
        aiResult;

      // 7. Update your detailedScore and feedback state
      setDetailedScore({
        metrics,
        matchedPoints,
        missingPoints,
        accuracy,
        feedbackSummary,
      });
      setFeedback({
        score: accuracy,
        text: feedbackSummary,
        strengths: matchedPoints,
        improvements: missingPoints,
      });

      // 8. Save the attempt
      const scoreData = {
        totalScore: metrics.overall_score,
        percentageScore: metrics.percentage_score,
        metrics,
        feedback: {
          summary: feedbackSummary,
          strengths: matchedPoints,
          improvements: missingPoints,
        },
      };
      await saveAttempt(selectedQuestion, scoreData);
    } catch (err) {
      console.error("Error analyzing response:", err);
      setError("Error analyzing your response. Please try again.");
    }
  };

  const generateDetailedFeedback = (metrics) => {
    const feedback = {
      summary: "",
      strengths: [],
      improvements: [],
    };

    const totalScore = metrics.overall_score;
    if (totalScore >= 8) {
      feedback.summary =
        "Excellent! Your response was well-structured, clear, and comprehensive.";
    } else if (totalScore >= 6) {
      feedback.summary =
        "Very good speaking! You have strong skills with just a few areas to improve.";
    } else if (totalScore >= 4.5) {
      feedback.summary =
        "Good job! Your speaking shows progress with some areas for improvement.";
    } else if (totalScore >= 3) {
      feedback.summary =
        "You're making progress. Focus on speaking longer and using complete sentences.";
    } else {
      feedback.summary =
        "Keep practicing! Try to speak for at least 30 seconds using complete sentences.";
    }

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

    if (metrics.speaking_duration.score < 4) {
      feedback.improvements.push(
        `Try to speak for at least 30 seconds (you spoke for ${Math.round(
          metrics.speaking_duration.duration_seconds
        )} seconds)`
      );
    }

    if (metrics.pronunciation.score < 0.75) {
      feedback.improvements.push(
        "Practice pronouncing longer, more complex words"
      );
    }

    if (metrics.sentence_framing.score < 0.75) {
      feedback.improvements.push(
        "Work on forming complete sentences with clear subject-verb structure"
      );
    }

    if (metrics.punctuation.score < 0.75) {
      feedback.improvements.push(
        "Use appropriate pauses and varied intonation to indicate punctuation"
      );
    }

    if (metrics.relevance.relevanceScore < 60) {
      feedback.improvements.push(
        "Try to make your response more relevant to the question"
      );
    }

    return feedback;
  };

  const assessRelevance = (question, response) => {
    const questionWords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const responseWords = response.toLowerCase().split(/\s+/);

    let matchCount = 0;
    questionWords.forEach((word) => {
      if (responseWords.includes(word)) matchCount++;
    });

    return Math.min(
      100,
      Math.round((matchCount / Math.max(1, questionWords.length)) * 100)
    );
  };

  const saveAttempt = async (question, scoreData) => {
    try {
      if (!userId) {
        setError("User not logged in");
        return;
      }

      const attemptData = {
        timestamp: new Date().toISOString(),
        speaking_duration: scoreData.metrics.speaking_duration.duration_seconds,
        minimum_duration_met:
          scoreData.metrics.speaking_duration.duration_seconds >= 30,
        attempt_score: scoreData.metrics.attempt.score,
        pronunciation_score: scoreData.metrics.pronunciation.score,
        sentence_framing_score: scoreData.metrics.sentence_framing.score,
        punctuation_score: scoreData.metrics.punctuation.score,
        relevance_score: scoreData.metrics.relevance.relevanceScore,
        overall_score: scoreData.metrics.overall_score,
        percentage_score: scoreData.metrics.percentage_score,
        transcript: transcript,
        feedback: scoreData.feedback,
      };

      const payload = {
        questionId: question.id,
        question: question.question,
        attemptData: attemptData,
        isFirstCompletion: !completedQuestions.includes(question.id),
      };

      await progressService.saveSalesSpeakingAttempt(userId, payload);

      if (
        !completedQuestions.includes(question.id) &&
        scoreData.metrics.overall_score >= 4.5
      ) {
        const updatedCompletedQuestions = [...completedQuestions, question.id];
        setCompletedQuestions(updatedCompletedQuestions);
      }

      await loadQuestionAttempts(question.id);

      const progressEvent = new CustomEvent("progressUpdated", {
        detail: {
          userId,
          skillType,
          type: "salesSpeaking",
          questionId: question.id,
        },
      });
      window.dispatchEvent(progressEvent);
    } catch (error) {
      console.error("Error saving attempt:", error);
      setError("Failed to save your attempt. Please try again.");
    }
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedQuestion(null);
    setTranscript("");
    setFeedback(null);
    setDetailedScore(null);
    setMaxPlaysReached(false);

    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Recognition already stopped");
      }
      setIsRecording(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        setTimerActive(false);
      }
    }

    textToSpeechService.cancel();
    setIsPlaying(false);

    loadAttemptHistory();
  };

  const tryAgain = () => {
    setTranscript("");
    setFeedback(null);
    setDetailedScore(null);
    textToSpeechService.resetPlayCount();
    setMaxPlaysReached(false);
  };

  const hasCompletedEnough = () => {
    if (!questions || !questions.length) return false;
    return completedQuestions.length >= Math.ceil(questions.length * 0.5);
  };

  const getQuestionsByLevel = () => {
    const categorized = {};
    questions.forEach((question) => {
      const level = question.level || "Beginner";
      if (!categorized[level]) {
        categorized[level] = [];
      }
      categorized[level].push(question);
    });
    return categorized;
  };

  const getQuestionsByCompletion = () => {
    const levelQs = questions.filter(q => q.level === currentLevel);
  
    return {
      completed:   levelQs.filter(q => isQuestionCompleted(q.id)),
      uncompleted: levelQs.filter(q => !isQuestionCompleted(q.id)),
    };
  };
  

  const getAverageScore = () => {
    if (attemptHistory.length === 0) return 0;
    const totalScore = attemptHistory.reduce((sum, attempt) => {
      const score = attempt.score || attempt.percentage_score || 0;
      return sum + score;
    }, 0);
    return Math.round(totalScore / attemptHistory.length);
  };

  const EnhancedScoreBreakdown = ({ scoreData }) => {
    if (!scoreData || !scoreData.metrics) return null;

    const { metrics } = scoreData;

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
          {/* <div className="total-score">
            <div className="score-circle">
              <span className="score-number">
                {Math.round(scoreData.totalScore)}
              </span>
              <span className="score-max">/9</span>
            </div>
            <div className="score-percentage">{scoreData.percentageScore}%</div>
          </div> */}
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
                  backgroundColor: getScoreColor(
                    metrics.speaking_duration?.score || 0,
                    5
                  ),
                }}
              ></div>
            </div>
            <div className="category-details">
              {metrics.speaking_duration?.duration_seconds >= 30 ? (
                <div className="detail-item success">
                  <span className="detail-check">✓</span> Spoke for minimum 30
                  seconds
                </div>
              ) : (
                <div className="detail-item warning">
                  <span className="detail-x">✗</span> Need to speak for at least
                  30 seconds
                </div>
              )}

              <div className="detail-item">
                <span className="detail-label">Your duration:</span>
                <span className="detail-value">
                  {Math.round(metrics.speaking_duration?.duration_seconds || 0)}{" "}
                  seconds
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
                  backgroundColor: getScoreColor(
                    metrics.pronunciation?.score || 0,
                    1
                  ),
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
                  backgroundColor: getScoreColor(
                    metrics.sentence_framing?.score || 0,
                    1
                  ),
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
                  backgroundColor: getScoreColor(
                    metrics.punctuation?.score || 0,
                    1
                  ),
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
            <span className="detail-value">
              {
                transcript.split(/\s+/).filter((w) => w.trim().length > 0)
                  .length
              }
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Relevance Score:</span>
            <span className="detail-value">
              {metrics.relevance?.relevanceScore || 0}%
            </span>
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

  const EnhancedAttemptHistory = () => {
    if (attemptHistory.length === 0) return null;

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

      const selectedAttempt = attemptHistory[index];

      const compatibleScoreData = {
        metrics: selectedAttempt,
        totalScore: selectedAttempt.overall_score,
        percentageScore: selectedAttempt.percentage_score,
        feedback: selectedAttempt.feedback,
      };

      setDetailedScore(compatibleScoreData);
      setFeedback({
        score: selectedAttempt.percentage_score,
        text: selectedAttempt.feedback?.summary || "",
        wordCount: selectedAttempt.transcript
          ? selectedAttempt.transcript
              .split(/\s+/)
              .filter((w) => w.trim().length > 0).length
          : 0,
      });
      setTranscript(selectedAttempt.transcript || "");
    };

    return (
      <div className="enhanced-history-section">
        {/* History display can remain commented out if not used */}
      </div>
    );
  };

  return (
    <div className="training-container">
      {/* Show loading spinner based on static questions loading */}
      {!questionsLoaded && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading sales speaking training...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="clear-error-btn">
            Dismiss
          </button>
        </div>
      )}

      {questionsLoaded && (
        <>
          <div className="training-header">
            <div className="SalesSpeakingSection-infoSection">
              <h1>Sales Speaking Training</h1>
              <p>
                Practice your speaking skills with real-world sales scenarios.
                Answer questions and receive feedback on your responses.
              </p>
              <p>You are allowed up to three attempts per passage.</p>
              <p>
                Consistent practice will help you earn higher rankings and
                achieve mastery.
              </p>
            </div>

            <div className="training-progress">
              <h3>Module Progress</h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />

              {hasCompletedEnough() ? (
                <div className="progress-message success">
                  <span className="checkmark">✓</span>
                  Congratulations! You have completed the Sales Speaking module!
                </div>
              ) : (
                <div className="progress-message">
                  Complete{" "}
                  {Math.ceil((questions ? questions.length : 0) * 0.5) -
                    completedQuestions.length}{" "}
                  more question(s) to complete this module.
                </div>
              )}
            </div>
          </div>

          {viewMode === "overview" ? (
            <div className="speaking-overview">
<div className="level-tabs">
  {["Beginner","Intermediate","Advanced"].map(level => (
    <button
      key={level}
      className={`tab-button ${level === currentLevel ? "active" : ""}`}
      onClick={() => setCurrentLevel(level)}
    >
      {level}
    </button>
  ))}
</div>

              {Object.keys(getQuestionsByCompletion()).map((status) => {
                const qs = getQuestionsByCompletion()[status];
                if (qs.length === 0) return null;

                return (
                  <div key={status} className="questions-section">
                    <h2>
                      {status === "completed"
                        ? "Completed Questions"
                        : "Questions to Complete"}
                    </h2>

                    <div className="cards-grid">
                      {qs.map((question) => {
                        const attempt = attemptHistory.find(
                          (a) => a.topicId === question.id
                        );

                        return (
                          <div
                            key={question.id}
                            className={`question-card ${
                              isQuestionCompleted(question.id)
                                ? "completed"
                                : ""
                            }`}
                            onClick={() => selectQuestion(question)}
                          >
                            <div className="question-card-header">
                              <span className="question-level">
                                {question.level || "Beginner"}
                              </span>
                              {isQuestionCompleted(question.id) && (
                                <span className="completion-badge">
                                  <span className="completion-icon">✓</span>
                                  <span className="completion-score">
                                    {attempt
                                      ? attempt.percentage_score ||
                                        attempt.score ||
                                        0
                                      : 0}
                                    %
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="question-card-content">
                              <p>{question.question}</p>
                            </div>

                            <div className="question-card-footer">
                              <button className="practice-button">
                                {isQuestionCompleted(question.id)
                                  ? "Practice Again"
                                  : "Start Practice"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Optionally, you can show a progress loading message if progressLoaded is false */}
              {!progressLoaded && (
                <div className="progress-loading">
                  <p>Loading progress data...</p>
                </div>
              )}

              {attemptHistory.length > 0 && <EnhancedAttemptHistory />}
            </div>
          ) : (
            <div className="question-practice">
              <div className="practice-header">
                <h2>
                  {selectedQuestion ? selectedQuestion.question : "Loading..."}
                </h2>
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
                      className={`play-button ${isPlaying ? "playing" : ""}`}
                      onClick={handlePlayAudio}
                      disabled={!selectedQuestion || maxPlaysReached}
                    >
                      <span className="play-icon">
                        {isPlaying ? "⏸️" : "▶️"}
                      </span>
                      {isPlaying ? "Pause Audio" : "Play Audio"}
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
                        className={`record-button ${
                          isRecording ? "recording" : ""
                        }`}
                        onClick={startRecording}
                        disabled={isRecording || !selectedQuestion}
                      >
                        {isRecording ? "Recording..." : "Start Recording"}
                      </button>

                      <button
                        className="stop-button"
                        onClick={stopRecording}
                        disabled={!isRecording}
                      >
                        Stop Recording
                      </button>
                    </div>

                    <TimerDisplay />

                    {isRecording && (
                      <div className="recording-status">
                        <div className="recording-indicator"></div>
                        <p>
                          Recording in progress... Speak clearly for at least 30
                          seconds.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {transcript && !isRecording && (
                  <div className="transcript-container">
                    <h3>Your Response:</h3>
                    <div className="transcript-text">{transcript}</div>
                    <div className="word-count">
                      Word count:{" "}
                      {
                        transcript
                          .split(/\s+/)
                          .filter((w) => w.trim().length > 0).length
                      }
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
                            backgroundColor:
                              feedback.score >= 80
                                ? "#4caf50"
                                : feedback.score >= 60
                                ? "#ff9800"
                                : "#f44336",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="feedback-text">{feedback.text}</div>
                    {detailedScore && (
                      <EnhancedScoreBreakdown scoreData={detailedScore} />
                    )}
                    {feedback.strengths?.length > 0 && (
                      <div className="feedback-strengths">
                        <h5>Strengths:</h5>
                        <ul>
                          {feedback.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {feedback.improvements?.length > 0 && (
                      <div className="feedback-improvements">
                        <h5>Areas for Improvement:</h5>
                        <ul>
                          {feedback.improvements.map((i, i2) => (
                            <li key={i2}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {feedback.score >= 60 &&
                      !isQuestionCompleted(selectedQuestion.id) && (
                        <div className="completion-notification">
                          <span className="check-icon">✓</span>
                          <span>Question completed successfully!</span>
                        </div>
                      )}

                    <div className="action-buttons">
                      <button className="retry-button" onClick={tryAgain}>
                        Try Again
                      </button>

                      <button
                        className="next-button"
                        onClick={handleBackToOverview}
                      >
                        Back to Questions
                      </button>
                    </div>
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