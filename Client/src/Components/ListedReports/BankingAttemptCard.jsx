import React, { useState } from 'react';
import CircularProgress from './CircularProgress';

const BankingAttemptCard = ({ attempt, attemptNumber }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Helper function to convert 0-100 score to 0-10 scale
  const convertScoreTo10 = (score) => {
    return Math.round(score / 10);
  };
  
  if (!attempt) return null;
  
  return (
    <div className="attempt-wrapper">
      <div className="attempt-number">Attempt {attemptNumber} - {new Date(attempt.timestamp).toLocaleString()}</div>
      <div className="attempt-card">
        <div className="attempt-metrics">
          {/* Progress Indicators */}
          <div className="progress-indicators">
            <CircularProgress 
              value={convertScoreTo10(attempt.overall_score)} 
              maxValue={10} 
              label="Overall" 
            />
            <CircularProgress 
              value={convertScoreTo10(attempt.banking_knowledge_score || 0)} 
              maxValue={10} 
              label="Banking" 
            />
            <CircularProgress 
              value={convertScoreTo10(attempt.customer_handling_score)} 
              maxValue={10} 
              label="Customer" 
            />
            <CircularProgress 
              value={convertScoreTo10(attempt.policy_adherence_score || 0)} 
              maxValue={10} 
              label="Policy" 
            />
          </div>
        </div>
        
        <div className="attempt-summary">
          <div className="summary-header" onClick={() => setShowSuggestions(!showSuggestions)}>
            <h4>Improvement Suggestions</h4>
            <div className={`expand-icon ${showSuggestions ? "expanded" : ""}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M6 9l6 6 6-6" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          
          {showSuggestions && (
            <div className="suggestions-list">
              {attempt.improvement_suggestions.map((suggestion, index) => (
                <div key={index} className="suggestion-item">{suggestion}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankingAttemptCard;