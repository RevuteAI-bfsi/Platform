import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ percentage, height = 15, showLabel = true }) => {
  // Ensure percentage is valid
  const validPercentage = Math.min(Math.max(percentage || 0, 0), 100);
  
  // Determine color based on progress
  const getColor = () => {
    if (validPercentage < 30) return '#ff9800'; // orange
    if (validPercentage < 70) return '#2196f3'; // blue
    return '#4caf50'; // green
  };

  return (
    <div className="progress-container" style={{ height: `${height}px` }}>
      <div 
        className="progress-fill" 
        style={{ 
          width: `${validPercentage}%`,
          backgroundColor: getColor(),
        }}
      />
      {showLabel && (
        <div className="progress-label">
          {Math.round(validPercentage)}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;