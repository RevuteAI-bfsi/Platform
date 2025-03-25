import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ percentage, height = 15, showLabel = true }) => {
  const validPercentage = Math.min(Math.max(percentage || 0, 0), 100);

  const getColor = () => {
    if (validPercentage < 30) return '#ff9800';
    if (validPercentage < 70) return '#2196f3';
    return '#4caf50';
  };

  return (
    <div 
      className="progress-container" 
      style={{ height: `${height}px` }}
    >
      {/* The fill */}
      <div 
        className="progress-fill" 
        style={{ 
          width: `${validPercentage}%`,
          background: `linear-gradient(180deg, rgba(255,255,255,0.3), transparent), ${getColor()}`
        }}
      />
      
      {/* The diamond label (absolutely positioned) */}
      {showLabel && (
        <div 
          className="progress-label progressBar-diamond" 
          style={{ 
            left: `${validPercentage}%`, // place diamond at the boundary
            backgroundColor: getColor()
          }}
        >
          <span>{Math.round(validPercentage)}%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
