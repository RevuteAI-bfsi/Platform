import React, { useState } from 'react';
import './AttemptHistory.css';

const AttemptHistory = ({ attempts, exerciseType }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!attempts || attempts.length === 0) {
    return null;
  }
  
  // Sort attempts by date descending (newest first)
  const sortedAttempts = [...attempts].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Find best attempt based on score
  const getBestAttempt = () => {
    if (sortedAttempts.length === 0) return null;
    
    return sortedAttempts.reduce((best, current) => 
      (current.score > best.score) ? current : best, sortedAttempts[0]
    );
  };
  
  const bestAttempt = getBestAttempt();
  
  // Format score display based on exercise type
  const formatScore = (score) => {
    switch (exerciseType) {
      case 'reading':
        return `${score}% Accuracy`;
      case 'listening':
      case 'speaking':
        return `${score}% Match`;
      default:
        return `${score}%`;
    }
  };
  
  // Get appropriate icon based on exercise type
  const getExerciseIcon = () => {
    switch (exerciseType) {
      case 'reading':
        return '📖';
      case 'listening':
        return '🎧';
      case 'speaking':
        return '🎤';
      default:
        return '📝';
    }
  };
  
  return (
    <div className="attempt-history">
      <div className="history-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-title">
          <span className="attempt-icon">{getExerciseIcon()}</span>
          <h3>Previous Attempts ({sortedAttempts.length})</h3>
        </div>
        <button className="toggle-button">
          {expanded ? '▲ Hide' : '▼ Show'}
        </button>
      </div>
      
      {expanded && (
        <div className="history-content">
          {bestAttempt && (
            <div className="best-attempt">
              <div className="best-badge">
                <span className="star-icon">⭐</span>
                <span>Best Attempt</span>
              </div>
              <div className="attempt-date">{formatDate(bestAttempt.date)}</div>
              <div className="attempt-score">{formatScore(bestAttempt.score)}</div>
            </div>
          )}
          
          <div className="attempts-list">
            <h4>All Attempts</h4>
            {sortedAttempts.map((attempt, index) => (
              <div 
                key={index}
                className={`attempt-item ${bestAttempt.date === attempt.date ? 'best' : ''}`}
              >
                <div className="attempt-number">#{sortedAttempts.length - index}</div>
                <div className="attempt-date">{formatDate(attempt.date)}</div>
                <div className="attempt-score">{formatScore(attempt.score)}</div>
                {bestAttempt.date === attempt.date && (
                  <div className="best-marker">Best</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttemptHistory;