// RetailScenarioCard.jsx
import React, { useState } from 'react';
import RetailAttemptCard from './RetailAttemptCard';
import { formatDate } from '../utils/dateUtils'; // You'll need a date formatting utility

const RetailScenarioCard = ({ scenario }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!scenario) return null;
  
  return (
    <div className="test-section">
      <div className="test-header" onClick={() => setExpanded(!expanded)}>
        <div className="test-info">
          <h4>{scenario.scenario_title}</h4>
          <span className="attempt-count">
            {scenario.total_attempts} attempts • Best Score: {scenario.best_score}/100
          </span>
        </div>
        <div className={`expand-icon ${expanded ? "expanded" : ""}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
      
      {expanded && (
        <div className="test-content">
          {scenario.attempts && scenario.attempts.length > 0 ? (
            <div className="attempts-container">
              {scenario.attempts.map((attempt, index) => (
                <RetailAttemptCard 
                  key={index} 
                  attempt={attempt} 
                  attemptNumber={scenario.attempts.length - index} 
                />
              ))}
            </div>
          ) : (
            <p className="no-data-message">No attempts recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RetailScenarioCard;