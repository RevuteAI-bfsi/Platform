import React from 'react';
import './AIAnalysis.css';

const AIAnalysis = ({ analysis, type = 'reading', isLoading = false, error = null }) => {
  if (isLoading) {
    return (
      <div className="ai-analysis loading">
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Analyzing your response with AI...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="ai-analysis error">
        <h3>AI Analysis Error</h3>
        <p className="error-message">{error}</p>
        <p className="error-note">The system was unable to perform AI analysis. Your score is still valid.</p>
      </div>
    );
  }
  
  if (!analysis) {
    return null;
  }
  
  // Format lists for display
  const formatList = (items) => {
    if (!items || items.length === 0) return "None detected";
    
    return (
      <ul className="analysis-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  };
  
  // Render different content based on exercise type
  const renderAnalysisContent = () => {
    switch (type) {
      case 'reading':
        return renderReadingAnalysis();
      case 'listening':
        return renderListeningAnalysis();
      case 'speaking':
        return renderSpeakingAnalysis();
      default:
        return <p>No analysis available for this exercise type.</p>;
    }
  };
  
  // Reading analysis content
  const renderReadingAnalysis = () => {
    return (
      <>
        <div className="analysis-section">
          <h4>Reading Assessment</h4>
          <p className="analysis-feedback">{analysis.feedback}</p>
        </div>
        
        <div className="analysis-section">
          <h4>Areas for Improvement</h4>
          {formatList(analysis.improvementTips)}
        </div>
        
        <div className="analysis-section columns">
          <div className="analysis-column">
            <h4>Mispronunciations</h4>
            {formatList(analysis.mispronunciations)}
          </div>
          
          <div className="analysis-column">
            <h4>Missed Words</h4>
            {formatList(analysis.missedWords)}
          </div>
        </div>
      </>
    );
  };
  
  // Listening analysis content
  const renderListeningAnalysis = () => {
    return (
      <>
        <div className="analysis-section">
          <h4>Listening Comprehension Assessment</h4>
          <p className="analysis-feedback">{analysis.feedback}</p>
        </div>
        
        <div className="analysis-section">
          <h4>Areas for Improvement</h4>
          {formatList(analysis.improvementTips)}
        </div>
        
        <div className="analysis-section columns">
          <div className="analysis-column">
            <h4>Missed Key Points</h4>
            {formatList(analysis.missedKeyPoints)}
          </div>
          
          <div className="analysis-column">
            <h4>Spelling Errors</h4>
            {formatList(analysis.spellingErrors)}
          </div>
        </div>
      </>
    );
  };
  
  // Speaking analysis content
  const renderSpeakingAnalysis = () => {
    return (
      <>
        <div className="analysis-section">
          <h4>Speaking Assessment</h4>
          <p className="analysis-feedback">{analysis.feedback}</p>
        </div>
        
        <div className="analysis-section">
          <h4>Areas for Improvement</h4>
          {formatList(analysis.improvementTips)}
        </div>
        
        <div className="analysis-section columns">
          <div className="analysis-column">
            <h4>Key Points Covered</h4>
            {formatList(analysis.keyPointsCovered)}
          </div>
          
          <div className="analysis-column">
            <h4>Missing Points</h4>
            {formatList(analysis.missingPoints)}
          </div>
        </div>
      </>
    );
  };
  
  return (
    <div className="ai-analysis">
      <div className="analysis-header">
        <h3>
          <span className="ai-icon">🤖</span>
          Enhanced AI Analysis
        </h3>
        <div className="ai-score-badge">
          <span className="ai-score">{analysis.overallScore}</span>
          <span className="ai-score-max">/10</span>
        </div>
      </div>
      
      {renderAnalysisContent()}
    </div>
  );
};

export default AIAnalysis;