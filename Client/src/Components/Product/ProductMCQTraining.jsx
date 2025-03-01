// src/components/Product/ProductMCQTraining.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import productMCQs from '../../training/product/productMCQs.json';
import ProgressBar from '../common/ProgressBar';
import '../Training/TrainingStyles.css';
import './ProductMCQStyles.css';

const ProductMCQTraining = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(productMCQs);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [learningCompleted, setLearningCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  
  useEffect(() => {
    // Check if learning is completed
    const checkLearningCompletion = () => {
      try {
        const savedProgress = JSON.parse(localStorage.getItem('productProgress') || '{}');
        const learningTopics = ['bank-terminologies', 'casa-kyc', 'personal-loans'];
        const allCompleted = learningTopics.every(topic => 
          savedProgress[topic] && savedProgress[topic].completed
        );
        
        setLearningCompleted(allCompleted);
        
        // Redirect if learning not completed
        if (!allCompleted) {
          navigate('/product/learning/bank-terminologies');
        }
      } catch (error) {
        console.error('Error checking learning completion:', error);
      }
    };
    
    checkLearningCompletion();
    
    // Load completed questions
    loadCompletedQuestions();
  }, [navigate]);
  
  // Load completed questions from localStorage
  const loadCompletedQuestions = () => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('productTrainingResults') || '{}');
      if (!trainingResults.mcq) {
        trainingResults.mcq = [];
      }
      
      const completed = trainingResults.mcq.map(result => result.questionId);
      setCompletedQuestions(completed);
      
      // Calculate overall score
      if (trainingResults.mcq.length > 0) {
        const totalScore = trainingResults.mcq.reduce((sum, result) => sum + (result.correct ? 1 : 0), 0);
        setScore(Math.round((totalScore / trainingResults.mcq.length) * 100));
      }
    } catch (error) {
      console.error('Error loading completed questions:', error);
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    return (completedQuestions.length / questions.length) * 100;
  };
  
  // Check if question is completed
  const isQuestionCompleted = (questionId) => {
    return completedQuestions.includes(questionId);
  };
  
  // Get current question
  const getCurrentQuestion = () => {
    return questions[currentQuestionIndex];
  };
  
  // Handle option selection
  const handleOptionSelect = (optionIndex) => {
    if (feedback) return; // Prevent changing after submission
    setSelectedOption(optionIndex);
  };
  
  // Submit answer
  const handleSubmit = () => {
    const currentQuestion = getCurrentQuestion();
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    
    setFeedback({
      correct: isCorrect,
      message: isCorrect ? 
        "Correct! Well done." : 
        `Incorrect. The correct answer is: ${currentQuestion.options[currentQuestion.correctAnswer]}`
    });
    
    setShowExplanation(true);
    
    // Save attempt
    saveAttempt(currentQuestion, isCorrect);
  };
  
  // Save attempt to localStorage
  const saveAttempt = (question, isCorrect) => {
    try {
      const trainingResults = JSON.parse(localStorage.getItem('productTrainingResults') || '{}');
      if (!trainingResults.mcq) {
        trainingResults.mcq = [];
      }
      
      // Check if this question was already answered
      const existingIndex = trainingResults.mcq.findIndex(result => result.questionId === question.id);
      
      if (existingIndex >= 0) {
        // Update existing result
        trainingResults.mcq[existingIndex] = {
          ...trainingResults.mcq[existingIndex],
          selectedOption: selectedOption,
          correct: isCorrect,
          date: new Date().toISOString()
        };
      } else {
        // Add new result
        trainingResults.mcq.push({
          questionId: question.id,
          question: question.question,
          selectedOption: selectedOption,
          correct: isCorrect,
          date: new Date().toISOString()
        });
      }
      
      localStorage.setItem('productTrainingResults', JSON.stringify(trainingResults));
      
      // Update completed questions
      if (!isQuestionCompleted(question.id)) {
        setCompletedQuestions([...completedQuestions, question.id]);
      }
      
      // Update score
      const totalScore = trainingResults.mcq.reduce((sum, result) => sum + (result.correct ? 1 : 0), 0);
      setScore(Math.round((totalScore / trainingResults.mcq.length) * 100));
    } catch (error) {
      console.error('Error saving attempt:', error);
    }
  };
  
  // Move to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
    } else {
      // All questions completed, show completion
      alert("Congratulations! You've completed all MCQ questions in this module.");
    }
  };
  
  // Go back to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      resetQuestionState();
    }
  };
  
  // Reset state for a new question
  // Continuing from resetQuestionState function
  // Reset state for a new question
  const resetQuestionState = () => {
    setSelectedOption(null);
    setFeedback(null);
    setShowExplanation(false);
  };
  
  // Try the same question again
  const handleTryAgain = () => {
    resetQuestionState();
  };
  
  // Format completion status for display
  const formatCompletionStatus = () => {
    return `${completedQuestions.length}/${questions.length} completed`;
  };
  
  // Get option label (A, B, C, D)
  const getOptionLabel = (index) => {
    return String.fromCharCode(65 + index);
  };

  return (
    <div className="training-container">
      <div className="training-header">
        <h1>Product Knowledge MCQs</h1>
        <p className="training-description">
          Test your banking product knowledge by answering these multiple-choice questions.
          Your score will reflect your understanding of the product topics.
        </p>
        
        <div className="training-progress">
          <h3>Progress ({Math.round(calculateCompletionPercentage())}%)</h3>
          <ProgressBar percentage={calculateCompletionPercentage()} />
          <div className="progress-message">
            {formatCompletionStatus()}
          </div>
          {completedQuestions.length > 0 && (
            <div className="score-display">
              Current Score: <span className="score-value">{score}%</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mcq-container">
        <div className="question-navigation">
          <button 
            className="nav-button previous"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            ← Previous
          </button>
          <span className="question-counter">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <button 
            className="nav-button next"
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            Next →
          </button>
        </div>
        
        {getCurrentQuestion() && (
          <div className="mcq-question">
            <h3 className="question-text">{getCurrentQuestion().question}</h3>
            
            <div className="options-container">
              {getCurrentQuestion().options.map((option, index) => (
                <div 
                  key={index}
                  className={`option ${selectedOption === index ? 'selected' : ''} ${
                    feedback ? 
                      (index === getCurrentQuestion().correctAnswer ? 'correct' : 
                       selectedOption === index ? 'incorrect' : '') 
                      : ''
                  }`}
                  onClick={() => handleOptionSelect(index)}
                >
                  <div className="option-label">{getOptionLabel(index)}</div>
                  <div className="option-text">{option}</div>
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
              <div className="feedback-container">
                <div className={`feedback-message ${feedback.correct ? 'correct' : 'incorrect'}`}>
                  {feedback.message}
                </div>
                
                {showExplanation && getCurrentQuestion().explanation && (
                  <div className="explanation">
                    <h4>Explanation:</h4>
                    <p>{getCurrentQuestion().explanation}</p>
                  </div>
                )}
                
                <div className="action-buttons">
                  <button 
                    className="try-again-button"
                    onClick={handleTryAgain}
                  >
                    Try Again
                  </button>
                  
                  {currentQuestionIndex < questions.length - 1 && (
                    <button 
                      className="next-button"
                      onClick={handleNextQuestion}
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMCQTraining;