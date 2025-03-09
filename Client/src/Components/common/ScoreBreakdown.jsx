import React from 'react';
import './ScoreBreakdown.css';

const ScoreBreakdown = ({ scoreData, type = 'reading' }) => {
  if (!scoreData) return null;
  
  const { metrics, totalScore, percentageScore } = scoreData;
  
  // Check if metrics is available
  if (!metrics) {
    return (
      <div className="score-breakdown">
        <div className="score-header">
          <h3>Score: {percentageScore || 0}%</h3>
        </div>
        <div className="error-message">
          <p>Detailed score metrics not available.</p>
        </div>
      </div>
    );
  }
  
  // Get color based on score
  const getScoreColor = (score, max) => {
    const ratio = score / max;
    if (ratio >= 0.8) return '#4caf50'; // green
    if (ratio >= 0.6) return '#ff9800'; // orange
    return '#f44336'; // red
  };
  
  // Render different breakdowns based on training type
  const renderBreakdown = () => {
    try {
      switch (type) {
        case 'reading':
          return renderReadingBreakdown();
        case 'listening':
          return renderListeningBreakdown();
        case 'speaking':
          return renderSpeakingBreakdown();
        default:
          return <p>Score data not available</p>;
      }
    } catch (error) {
      console.error('Error rendering score breakdown:', error);
      return (
        <div className="error-message">
          <p>An error occurred while displaying the score breakdown.</p>
          <p>Please try again later.</p>
        </div>
      );
    }
  };
  
  // Render breakdown for reading exercise
  const renderReadingBreakdown = () => {
    // Check if required metrics are available
    if (!metrics.contentAccuracy || !metrics.speechPatterns) {
      return (
        <div className="error-message">
          <p>Reading score breakdown data is incomplete.</p>
        </div>
      );
    }
    
    return (
      <div className="score-details">
        <div className="score-section">
          <h4>Content Accuracy (5 points)</h4>
          <div className="score-item">
            <div className="score-label">
              <span>Correct Words</span>
              <span>{Math.round(metrics.contentAccuracy.correctWords)} / {metrics.contentAccuracy.totalWords}</span>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${(metrics.contentAccuracy.correctWords / metrics.contentAccuracy.totalWords) * 100}%`,
                  backgroundColor: getScoreColor(metrics.contentAccuracy.score, 5)
                }}
              ></div>
            </div>
          </div>
          <div className="score-value">
            Score: <span style={{ color: getScoreColor(metrics.contentAccuracy.score, 5) }}>
              {metrics.contentAccuracy.score} / 5
            </span>
          </div>
          
          {metrics.contentAccuracy.misspelledWords && metrics.contentAccuracy.misspelledWords.length > 0 && (
            <div className="misspelled-words">
              <h5>Misspelled Words</h5>
              <ul>
                {metrics.contentAccuracy.misspelledWords.slice(0, 5).map((word, index) => (
                  <li key={index}>
                    <span className="original">{word.original}</span> →
                    <span className="transcribed">{word.transcribed || '(missed)'}</span>
                  </li>
                ))}
                {metrics.contentAccuracy.misspelledWords.length > 5 && (
                  <li>...and {metrics.contentAccuracy.misspelledWords.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
        
        <div className="score-section">
          <h4>Speech Patterns (5 points)</h4>
          
          <div className="score-item">
            <div className="score-label">
              <span>Pauses at Punctuation</span>
              <span>{metrics.speechPatterns.pausesAtPunctuation.detected} / {metrics.speechPatterns.pausesAtPunctuation.expected}</span>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar"
                style={{ 
                  width: `${metrics.speechPatterns.pausesAtPunctuation.expected > 0 ? 
                    (metrics.speechPatterns.pausesAtPunctuation.detected / metrics.speechPatterns.pausesAtPunctuation.expected) * 100 : 0}%`,
                  backgroundColor: getScoreColor(metrics.speechPatterns.pausesAtPunctuation.score, 2)
                }}
              ></div>
            </div>
            <div className="score-value">
              Score: <span style={{ color: getScoreColor(metrics.speechPatterns.pausesAtPunctuation.score, 2) }}>
                {metrics.speechPatterns.pausesAtPunctuation.score} / 2
              </span>
            </div>
          </div>
          
          <div className="score-item">
            <div className="score-label">
              <span>Speaking Duration</span>
              <span>{Math.round(metrics.speechPatterns.speaking.duration)}s / 
              ~{Math.round(metrics.speechPatterns.speaking.expectedDuration)}s</span>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar"
                style={{ 
                  width: `${Math.min(100, (metrics.speechPatterns.speaking.duration / metrics.speechPatterns.speaking.expectedDuration) * 100)}%`,
                  backgroundColor: getScoreColor(metrics.speechPatterns.speaking.score, 1)
                }}
              ></div>
            </div>
            <div className="score-value">
              Score: <span style={{ color: getScoreColor(metrics.speechPatterns.speaking.score, 1) }}>
                {metrics.speechPatterns.speaking.score} / 1
              </span>
            </div>
          </div>
          
          <div className="score-item">
            <div className="score-label">
              <span>Intonation & Expression</span>
            </div>
            <div className="score-value">
              Score: <span style={{ color: getScoreColor(metrics.speechPatterns.intonation.score, 2) }}>
                {metrics.speechPatterns.intonation.score} / 2
              </span>
            </div>
          </div>
        </div>
        
        <div className="score-section">
          <h4>Attempt Points</h4>
          <div className="score-value">
            Score: <span style={{ color: '#4caf50' }}>{metrics.attemptScore} / 3</span>
          </div>
          <p className="score-note">Points awarded for completing the attempt</p>
        </div>
      </div>
    );
  };
  
  // Render breakdown for listening exercise
  const renderListeningBreakdown = () => {
    // Check for the structure coming from ListeningTraining
    if (metrics.contentAccuracy) {
      // This handles the new data structure from our calculateDetailedScore function
      return (
        <div className="score-details">
          <div className="score-section">
            <h4>Content Accuracy (5 points)</h4>
            <div className="score-item">
              <div className="score-label">
                <span>Correct Words</span>
                <span>{Math.round(metrics.contentAccuracy.correctWords)} / {metrics.contentAccuracy.totalWords}</span>
              </div>
              <div className="score-bar-container">
                <div 
                  className="score-bar" 
                  style={{ 
                    width: `${(metrics.contentAccuracy.totalWords > 0) ? 
                      (metrics.contentAccuracy.correctWords / metrics.contentAccuracy.totalWords) * 100 : 0}%`,
                    backgroundColor: getScoreColor(metrics.contentAccuracy.score, 5)
                  }}
                ></div>
              </div>
              <div className="score-value">
                Score: <span style={{ color: getScoreColor(metrics.contentAccuracy.score, 5) }}>
                  {metrics.contentAccuracy.score} / 5
                </span>
              </div>
            </div>
            
            {metrics.contentAccuracy.misspelledWords && metrics.contentAccuracy.misspelledWords.length > 0 && (
              <div className="misspelled-words">
                <h5>Mismatched Words</h5>
                <ul>
                  {metrics.contentAccuracy.misspelledWords.slice(0, 5).map((word, index) => (
                    <li key={index}>
                      <span className="original">{word.original}</span> →
                      <span className="transcribed">{word.transcribed || '(missed)'}</span>
                    </li>
                  ))}
                  {metrics.contentAccuracy.misspelledWords.length > 5 && (
                    <li>...and {metrics.contentAccuracy.misspelledWords.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          
          <div className="score-section">
            <h4>Delivery (2 points)</h4>
            <div className="score-item">
              <div className="score-label">
                <span>Expression & Intonation</span>
              </div>
              <div className="score-bar-container">
                <div 
                  className="score-bar" 
                  style={{ 
                    width: `${(metrics.speechPatterns?.intonation?.score / 2) * 100 || 0}%`,
                    backgroundColor: getScoreColor(metrics.speechPatterns?.intonation?.score || 0, 2)
                  }}
                ></div>
              </div>
              <div className="score-value">
                Score: <span style={{ color: getScoreColor(metrics.speechPatterns?.intonation?.score || 0, 2) }}>
                  {metrics.speechPatterns?.intonation?.score || 0} / 2
                </span>
              </div>
            </div>
          </div>
          
          <div className="score-section">
            <h4>Attempt Points</h4>
            <div className="score-value">
              Score: <span style={{ color: '#4caf50' }}>{metrics.attemptScore || 0} / 3</span>
            </div>
            <p className="score-note">Points awarded for completing the attempt</p>
          </div>
        </div>
      );
    }
    
    // Check if the old structure is available (with spelling, content, punctuation)
    if (metrics.spelling && metrics.content && metrics.punctuation) {
      return (
        <div className="score-details">
          <div className="score-section">
            <h4>Spelling (3 points)</h4>
            <div className="score-item">
              <div className="score-label">
                <span>Correctly Spelled Words</span>
                <span>{metrics.spelling.correctWords} / {metrics.spelling.totalWords}</span>
              </div>
              <div className="score-bar-container">
                <div 
                  className="score-bar" 
                  style={{ 
                    width: `${metrics.spelling.totalWords > 0 ? 
                      (metrics.spelling.correctWords / metrics.spelling.totalWords) * 100 : 0}%`,
                    backgroundColor: getScoreColor(metrics.spelling.score, 3)
                  }}
                ></div>
              </div>
              <div className="score-value">
                Score: <span style={{ color: getScoreColor(metrics.spelling.score, 3) }}>
                  {metrics.spelling.score} / 3
                </span>
              </div>
            </div>
            
            {metrics.spelling.misspelledWords && metrics.spelling.misspelledWords.length > 0 && (
              <div className="misspelled-words">
                <h5>Misspelled/Incorrect Words</h5>
                <ul>
                  {metrics.spelling.misspelledWords.slice(0, 5).map((word, index) => (
                    <li key={index}>{word}</li>
                  ))}
                  {metrics.spelling.misspelledWords.length > 5 && (
                    <li>...and {metrics.spelling.misspelledWords.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          
          <div className="score-section">
            <h4>Content Accuracy (5 points)</h4>
            <div className="score-item">
              <div className="score-label">
                <span>Key Points Covered</span>
                <span>{metrics.content.keyPointsMatched} / {metrics.content.totalKeyPoints}</span>
              </div>
              <div className="score-bar-container">
                <div 
                  className="score-bar" 
                  style={{ 
                    width: `${metrics.content.totalKeyPoints > 0 ? 
                      (metrics.content.keyPointsMatched / metrics.content.totalKeyPoints) * 100 : 0}%`,
                    backgroundColor: getScoreColor(metrics.content.score, 5)
                  }}
                ></div>
              </div>
              <div className="score-value">
                Score: <span style={{ color: getScoreColor(metrics.content.score, 5) }}>
                  {metrics.content.score} / 5
                </span>
              </div>
            </div>
          </div>
          
          <div className="score-section">
            <h4>Punctuation (2 points)</h4>
            <div className="score-item">
              <div className="score-label">
                <span>Proper Punctuation Use</span>
                <span>{metrics.punctuation.correctPunctuation} / {metrics.punctuation.totalPunctuation}</span>
              </div>
              <div className="score-bar-container">
                <div 
                  className="score-bar" 
                  style={{ 
                    width: `${metrics.punctuation.totalPunctuation > 0 ? 
                      (metrics.punctuation.correctPunctuation / metrics.punctuation.totalPunctuation) * 100 : 0}%`,
                    backgroundColor: getScoreColor(metrics.punctuation.score, 2)
                  }}
                ></div>
              </div>
              <div className="score-value">
                Score: <span style={{ color: getScoreColor(metrics.punctuation.score, 2) }}>
                  {metrics.punctuation.score} / 2
                </span>
              </div>
            </div>
          </div>
          
          <div className="score-section">
            <h4>Attempt Points</h4>
            <div className="score-value">
              Score: <span style={{ color: '#4caf50' }}>{metrics.attemptScore} / 3</span>
            </div>
            <p className="score-note">Points awarded for completing the attempt</p>
          </div>
        </div>
      );
    }
    
    // Fallback if neither structure is available
    return (
      <div className="score-details">
        <div className="error-message">
          <p>Score breakdown data structure is not recognized.</p>
          <p>Score: {percentageScore}%</p>
        </div>
      </div>
    );
  };
  
  // Render breakdown for speaking exercise
  const renderSpeakingBreakdown = () => {
    // Add basic error checking
    if (!metrics || typeof percentageScore === 'undefined') {
      return (
        <div className="error-message">
          <p>Speaking score data is not available.</p>
        </div>
      );
    }
    
    return (
      <div className="score-details">
        <div className="score-section">
          <h4>Overall Speaking Performance</h4>
          <div className="score-item">
            <div className="score-label">
              <span>Score</span>
              <span>{percentageScore}%</span>
            </div>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ 
                  width: `${percentageScore}%`,
                  backgroundColor: getScoreColor(percentageScore, 100)
                }}
              ></div>
            </div>
          </div>
        </div>
        
        {metrics.wordCount && (
          <div className="score-section">
            <h4>Speaking Details</h4>
            <div className="score-item">
              <div className="score-label">
                <span>Word Count</span>
                <span>{metrics.wordCount || 0}</span>
              </div>
            </div>
            
            {metrics.keyPointsCovered && (
              <div className="score-item">
                <div className="score-label">
                  <span>Key Points Covered</span>
                  <span>{metrics.keyPointsCovered || 0} / {metrics.totalKeyPoints || 0}</span>
                </div>
                <div className="score-bar-container">
                  <div 
                    className="score-bar" 
                    style={{ 
                      width: `${metrics.totalKeyPoints > 0 ? 
                        (metrics.keyPointsCovered / metrics.totalKeyPoints) * 100 : 0}%`,
                      backgroundColor: getScoreColor(metrics.keyPointsCovered, metrics.totalKeyPoints)
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="score-breakdown">
      <div className="score-header">
        <h3>Score Breakdown</h3>
        <div className="total-score">
          <div className="score-circle">
            <span className="score-number">{totalScore || Math.round(percentageScore / 10)}</span>
            <span className="score-max">/10</span>
          </div>
          <div className="score-percentage">{percentageScore || 0}%</div>
        </div>
      </div>
      
      {renderBreakdown()}
    </div>
  );
};

export default ScoreBreakdown;