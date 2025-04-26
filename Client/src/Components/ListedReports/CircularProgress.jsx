import React from 'react';

const CircularProgress = ({ value, maxValue, label }) => {
  // Calculate the percentage for the circle
  const percentage = (value / maxValue) * 100;
  
  // Calculate the stroke-dasharray and stroke-dashoffset
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="circular-progress-container">
      <div className="circular-progress">
        {/* Background circle */}
        <svg className="progress-svg" viewBox="0 0 100 100">
          <circle
            className="progress-background"
            cx="50"
            cy="50"
            r={radius}
          />
          {/* Progress circle */}
          <circle
            className="progress-indicator"
            cx="50"
            cy="50"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>
        {/* Score text */}
        <div className="progress-text">
          <span className="score-value">{value}/{maxValue}</span>
        </div>
      </div>
      <div className="progress-label">
        <span>{label}</span>
      </div>
    </div>
  );
};

export default CircularProgress;