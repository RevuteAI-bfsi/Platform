import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProgressBar from '../common/ProgressBar';
import progressService from '../../services/progressService';
import { determineSkillType } from '../../utils/skillTypeUtils';
import '../Training/TrainingStyles.css';
import './ProductMCQStyles.css';

// Create a fallback if the JSON import fails
const fallbackProductMCQs = [
  {
    id: "mcq-1",
    question: "What is CASA in banking?",
    options: [
      "Current And Savings Account",
      "Credit And Savings Arrangement",
      "Customer Account Service Authorization",
      "Classified Asset Security Assessment"
    ],
    correctAnswer: 0,
    explanation: "CASA stands for Current And Savings Account. It refers to the deposits made in current and savings accounts maintained with a bank."
  },
  {
    id: "mcq-2",
    question: "What does KYC stand for in banking?",
    options: [
      "Keep Your Customer",
      "Know Your Customer",
      "Key Yield Calculation",
      "Knowledge Yielding Credentials"
    ],
    correctAnswer: 1,
    explanation: "KYC stands for Know Your Customer. It's a process by which banks obtain information about the identity and address of the customers."
  },
  {
    id: "mcq-3",
    question: "Which of the following is NOT a typical feature of a personal loan?",
    options: [
      "Unsecured lending",
      "Fixed interest rate",
      "Collateral requirement",
      "Fixed repayment period"
    ],
    correctAnswer: 2,
    explanation: "Personal loans are typically unsecured loans, meaning they don't require collateral. They usually have fixed interest rates and fixed repayment periods."
  }
];

const ProductMCQTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const userId = localStorage.getItem('userId');
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [viewMode, setViewMode] = useState('questions'); // 'questions' or 'overview'
  const [attemptHistory, setAttemptHistory] = useState([]);
  
  // Use consistent skill type detection
  const skillType = determineSkillType(location.pathname);

  // Load the MCQ questions
  useEffect(() => {
    try {
      console.log('Initializing ProductMCQTraining component...');
      
      // Try to dynamically import the questions
      import('../../training/product/productMCQs.json')
        .then((importedQuestions) => {
          console.log('Successfully loaded product MCQs:', importedQuestions.default);
          // Validate the imported data
          if (Array.isArray(importedQuestions.default) && importedQuestions.default.length > 0) {
            setQuestions(importedQuestions.default);
          } else {
            console.warn('Imported product MCQs have invalid format, using fallback');
            setQuestions(fallbackProductMCQs);
          }
          setContentLoaded(true);
        })
        .catch((err) => {
          console.error('Error importing product MCQs:', err);
          console.log('Using fallback questions instead');
          setQuestions(fallbackProductMCQs);
          setContentLoaded(true);
        });
    } catch (err) {
      console.error('Error in setup:', err);
      setError('Failed to initialize training. Please try again.');
      setQuestions(fallbackProductMCQs);
      setContentLoaded(true);
    }
  }, []);

  // Get learning topics based on skill type
  const getLearningTopics = useCallback(() => {
    if (skillType === 'product') {
      return ['bank-terminologies', 'casa-kyc', 'personal-loans'];
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
          
          console.log(`All ${skillType} topics completed? ${allLearningCompleted}`);
          
          // Store in localStorage for future checks
          if (allLearningCompleted) {
            localStorage.setItem(`${skillType}_completed`, JSON.stringify(learningTopics));
          }
        }
        
        setLearningCompleted(allLearningCompleted);
        
        // Only redirect if prerequisites are not met AND this is the first load
        // This prevents endless redirect loops
        if (!allLearningCompleted && !window.location.pathname.includes("/qa/mcq")) {
          console.log(`Not all learning topics completed, redirecting to learning page`);
          navigate(`/${skillType}/learning/${learningTopics[0]}`);
          return;
        }
        
        await loadCompletedQuestions();
        setLoading(false);
      } catch (err) {
        console.error('Error checking completion:', err);
        setError('Failed to load progress data. Please try again.');
        setLoading(false);
      }
    };

    if (contentLoaded) {
      checkLearningCompletion();
    }
  }, [contentLoaded, navigate, userId, skillType, getLearningTopics]);

  const loadCompletedQuestions = async () => {
    try {
      if (!userId) return;
      
      console.log(`Loading completed MCQ questions for user ${userId}`);
      
      const userProgress = await progressService.getUserProgress(userId);
      const trainingProgress = userProgress.trainingProgress || {};
      const mcqAttempts = trainingProgress.mcq || [];
      
      // Set attempt history
      setAttemptHistory(mcqAttempts);
      
      const completed = mcqAttempts.map(result => result.questionId);
      
      console.log(`Found ${completed.length} completed MCQ questions`);
      
      setCompletedQuestions(completed);
      
      // Calculate overall score
      if (mcqAttempts.length > 0) {
        const totalScore = mcqAttempts.reduce((sum, result) => sum + (result.correct ? 1 : 0), 0);
        setScore(Math.round((totalScore / mcqAttempts.length) * 100));
      }
    } catch (error) {
      console.error('Error loading completed questions:', error);
      setError('Failed to load completed questions. Please try again.');
    }
  };

  const calculateCompletionPercentage = () => {
    if (!questions || !questions.length) return 0;
    return (completedQuestions.length / questions.length) * 100;
  };

  const isQuestionCompleted = (questionId) => completedQuestions.includes(questionId);

  const getCurrentQuestion = () => {
    if (!questions || !questions.length) return null;
    if (currentQuestionIndex >= questions.length) {
      return questions[0];
    }
    return questions[currentQuestionIndex];
  };

  const handleOptionSelect = (optionIndex) => {
    if (feedback) return; // Don't allow changing option after submitting
    setSelectedOption(optionIndex);
  };

  const handleSubmit = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) {
      setError('No question found. Please try refreshing the page.');
      return;
    }
    
    if (selectedOption === null) {
      setError('Please select an option before submitting.');
      return;
    }
    
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    setFeedback({
      correct: isCorrect,
      message: isCorrect
        ? "Correct! Well done."
        : `Incorrect. The correct answer is: ${currentQuestion.options[currentQuestion.correctAnswer]}`
    });
    setShowExplanation(true);
    saveAttempt(currentQuestion, isCorrect);
  };

  const saveAttempt = async (question, isCorrect) => {
    try {
      if (!userId) {
        setError('User not logged in');
        return;
      }
      
      // Corrected: use "isCorrect" and "timestamp" to match the schema
      const newAttempt = {
        questionId: question.id,
        selectedOption: selectedOption,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
      };
      
      console.log(`Saving MCQ attempt:`, newAttempt);
      
      await progressService.saveTrainingAttempt(userId, 'mcq', newAttempt);
      
      // Update local state
      if (!completedQuestions.includes(question.id)) {
        setCompletedQuestions([...completedQuestions, question.id]);
      }
      
      // Add to attempt history
      setAttemptHistory([...attemptHistory, newAttempt]);
      
      // Recalculate score (example calculation; adjust as needed)
      const newScore = Math.round(
        ((completedQuestions.length * score / 100) + (isCorrect ? 1 : 0)) / 
        (completedQuestions.length + 1) * 100
      );
      setScore(newScore);
      
      // Dispatch event to refresh progress in other components
      const progressEvent = new CustomEvent('progressUpdated', {
        detail: { userId, skillType, type: 'mcq', questionId: question.id }
      });
      window.dispatchEvent(progressEvent);
      
      console.log('MCQ attempt saved and progressUpdated event dispatched');
    } catch (error) {
      console.error('Error saving attempt:', error);
      setError('Failed to save your attempt. Please try again.');
    }
  };
  

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setFeedback(null);
    setShowExplanation(false);
    
    // Move to next question or wrap around to beginning
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentQuestionIndex(0);
    }
  };

  const hasCompletedEnough = () => {
    if (!questions || !questions.length) return false;
    return completedQuestions.length >= Math.ceil(questions.length * 0.5);
  };

  const getQuestionsByType = () => {
    const categorized = {
      completed: [],
      notCompleted: []
    };
    
    questions.forEach(question => {
      if (isQuestionCompleted(question.id)) {
        categorized.completed.push(question);
      } else {
        categorized.notCompleted.push(question);
      }
    });
    
    return categorized;
  };

  const jumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setSelectedOption(null);
    setFeedback(null);
    setShowExplanation(false);
    setViewMode('questions');
  };

  // Calculate correct answers count
  const getCorrectAnswersCount = () => {
    return attemptHistory.filter(attempt => attempt.correct).length;
  };

  return (
    <div className="training-container">
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading product knowledge quiz...</p>
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
          <div className='SalesSpeakingSection-infoSection'>
            <h1>Product Knowledge Quiz</h1>
            <p>Test your knowledge of banking products and services with this multiple-choice quiz. Answer the questions to the best of your ability and learn more about the correct answers and explanations.</p>
            <p>You are allowed up to three attempts per passage.</p>
              <p>
                Consistent practice will help you earn higher rankings and
                achieve mastery.
              </p>
          </div>
            
            <div className="training-progress">
              <h3>Module Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
              <ProgressBar percentage={calculateCompletionPercentage()} />
              
              {hasCompletedEnough() ? (
                <div className="progress-message success">
                  <span className="checkmark">✓</span>
                  Congratulations! You have completed the Product Knowledge module!
                </div>
              ) : (
                <div className="progress-message">
                  Complete {Math.ceil((questions ? questions.length : 0) * 0.5) - completedQuestions.length} more question(s) to complete this module.
                </div>
              )}
              
              {/* <div className="score-display-container">
                <div className="score-item">
                  <span className="score-label">Overall Score:</span>
                  <span className="score-value" style={{
                    color: score >= 80 ? '#4caf50' : 
                           score >= 60 ? '#ff9800' : '#f44336'
                  }}>{score}%</span>
                </div>
                <div className="score-item">
                  <span className="score-label">Correct Answers:</span>
                  <span className="score-value">{getCorrectAnswersCount()} / {attemptHistory.length}</span>
                </div>
              </div> */}
              
              <div className="view-toggle">
                <button 
                  className={`view-button ${viewMode === 'questions' ? 'active' : ''}`} 
                  onClick={() => setViewMode('questions')}
                >
                  Current Question
                </button>
                <button 
                  className={`view-button ${viewMode === 'overview' ? 'active' : ''}`} 
                  onClick={() => setViewMode('overview')}
                >
                  Questions Overview
                </button>
              </div>
            </div>
          </div>
          
          {viewMode === 'overview' ? (
            <div className="questions-overview">
              <h2>Questions Overview</h2>
              
              <div className="questions-stats">
                <div className="stat-item">
                  <span className="stat-value">{questions.length}</span>
                  <span className="stat-label">Total Questions</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{completedQuestions.length}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{questions.length - completedQuestions.length}</span>
                  <span className="stat-label">Remaining</span>
                </div>
              </div>
              
              <div className="questions-sections">
                {getQuestionsByType().notCompleted.length > 0 && (
                  <div className="questions-section">
                    <h3>Questions to Complete</h3>
                    <div className="question-buttons">
                      {getQuestionsByType().notCompleted.map((question, index) => {
                        const questionIndex = questions.findIndex(q => q.id === question.id);
                        return (
                          <button 
                            key={question.id} 
                            className="question-button" 
                            onClick={() => jumpToQuestion(questionIndex)}
                          >
                            {questionIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {getQuestionsByType().completed.length > 0 && (
                  <div className="questions-section">
                    <h3>Completed Questions</h3>
                    <div className="question-buttons">
                      {getQuestionsByType().completed.map((question, index) => {
                        const questionIndex = questions.findIndex(q => q.id === question.id);
                        const attempt = attemptHistory.find(a => a.questionId === question.id);
                        const isCorrect = attempt && attempt.correct;
                        
                        return (
                          <button 
                            key={question.id} 
                            className={`question-button completed ${isCorrect ? 'correct' : 'incorrect'}`}
                            onClick={() => jumpToQuestion(questionIndex)}
                          >
                            {questionIndex + 1}
                            {isCorrect ? 
                              <span className="question-status correct">✓</span> : 
                              <span className="question-status incorrect">✗</span>
                            }
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {attemptHistory.length > 0 && (
                <div className="recent-attempts">
                  <h3>Recent Attempts</h3>
                  <table className="attempts-table">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Result</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attemptHistory.slice(-5).reverse().map((attempt, index) => {
                        const questionNumber = questions.findIndex(q => q.id === attempt.questionId) + 1;
                        return (
                          <tr key={index}>
                            <td>Question {questionNumber}</td>
                            <td className={attempt.correct ? 'correct-text' : 'incorrect-text'}>
                              {attempt.correct ? 'Correct ✓' : 'Incorrect ✗'}
                            </td>
                            <td>{new Date(attempt.date).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="mcq-container">
              <div className="question-navigation">
                <div className="question-counter">
                  Question {currentQuestionIndex + 1} of {questions ? questions.length : 0}
                </div>
                <div className="navigation-buttons">
                  <button 
                    className="nav-button"
                    onClick={() => setViewMode('overview')}
                  >
                    View All Questions
                  </button>
                </div>
              </div>
              
              <div className="question-content">
                <div className="question-text">
                  {getCurrentQuestion() ? getCurrentQuestion().question : 'Loading question...'}
                </div>
                
                <div className="options-container">
                  {getCurrentQuestion() && getCurrentQuestion().options.map((option, index) => (
                    <div 
                      key={index} 
                      className={`option ${selectedOption === index ? 'selected' : ''} ${
                        feedback ? (
                          index === getCurrentQuestion().correctAnswer ? 'correct' :
                          selectedOption === index ? 'incorrect' : ''
                        ) : ''
                      }`}
                      onClick={() => handleOptionSelect(index)}
                    >
                      <div className="option-label">{String.fromCharCode(65 + index)}</div>
                      <div className="option-text">{option}</div>
                      {feedback && index === getCurrentQuestion().correctAnswer && (
                        <div className="option-indicator correct">✓</div>
                      )}
                      {feedback && selectedOption === index && index !== getCurrentQuestion().correctAnswer && (
                        <div className="option-indicator incorrect">✗</div>
                      )}
                    </div>
                  ))}
                </div>
                
                {!feedback ? (
                  <button 
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={selectedOption === null}
                  >
                    Submit Answer
                  </button>
                ) : (
                  <div className="feedback-block">
                    <div className={`feedback-message ${feedback.correct ? 'correct' : 'incorrect'}`}>
                      <div className="feedback-icon">{feedback.correct ? '✓' : '✗'}</div>
                      <div className="feedback-text">{feedback.message}</div>
                    </div>
                    
                    {showExplanation && getCurrentQuestion() && getCurrentQuestion().explanation && (
                      <div className="explanation">
                        <h4>Explanation:</h4>
                        <p>{getCurrentQuestion().explanation}</p>
                      </div>
                    )}
                    
                    <button className="next-button" onClick={handleNextQuestion}>
                      Next Question
                    </button>
                  </div>
                )}
                
                {getCurrentQuestion() && isQuestionCompleted(getCurrentQuestion().id) && !feedback && (
                  <div className="completed-indicator">
                    <span className="checkmark">✓</span> You've already answered this question
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

export default ProductMCQTraining;