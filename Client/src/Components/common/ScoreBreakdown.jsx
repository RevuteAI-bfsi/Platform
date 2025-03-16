import React from 'react';
import './ScoreBreakdown.css';

const ScoreBreakdown = ({ scoreData, type = 'reading' }) => {
  if (!scoreData) return null;
  
  const { metrics, totalScore, percentageScore, feedback } = scoreData;
  
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
          // Check if we have enhanced metrics format
          if (metrics.accuracy || metrics.fluency) {
            return renderEnhancedReadingBreakdown();
          }
          // Fall back to original format
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
  
  // Render the enhanced reading breakdown with our new metrics structure
  const renderEnhancedReadingBreakdown = () => {
    return (
      <div className="enhanced-score-details">
        {/* Overall summary section with strengths and improvements */}
        {feedback && (
          <div className="enhanced-summary-section">
            <p className="enhanced-score-feedback">{feedback.summary}</p>
            
            {feedback.strengths.length > 0 && (
              <div className="enhanced-strengths">
                <h4>Strengths:</h4>
                <ul>
                  {feedback.strengths.map((strength, index) => (
                    <li key={`strength-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {feedback.improvements.length > 0 && (
              <div className="enhanced-improvements">
                <h4>Suggestions for Improvement:</h4>
                <ul>
                  {feedback.improvements.map((improvement, index) => (
                    <li key={`improvement-${index}`}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Detailed metrics grid */}
        <div className="enhanced-metrics-grid">
          {/* Accuracy Card */}
          <div className="enhanced-metric-card">
            <h4>Accuracy <span className="enhanced-score-badge">
              {Math.round(metrics.accuracy.score / 30 * 100)}%
            </span></h4>
            <div className="enhanced-metric-bar">
              <div 
                className="enhanced-metric-fill" 
                style={{ 
                  width: `${Math.round(metrics.accuracy.score / 30 * 100)}%`,
                  backgroundColor: getScoreColor(metrics.accuracy.score, 30)
                }}
              ></div>
            </div>
            <div className="enhanced-metric-details">
              <p>Word Error Rate: {(metrics.accuracy.wer * 100).toFixed(1)}%</p>
              <p>Correct Words: {metrics.accuracy.correctWords}/{metrics.accuracy.totalWords}</p>
              {metrics.accuracy.misspelledWords.length > 0 && (
                <div className="enhanced-detail-item">
                  <p>Words with issues:</p>
                  <div className="enhanced-words-list">
                    {metrics.accuracy.misspelledWords.slice(0, 5).map((word, i) => (
                      <span key={`miss-${i}`} className="enhanced-problem-word">
                        {word.original || word}
                      </span>
                    ))}
                    {metrics.accuracy.misspelledWords.length > 5 && <span>...</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Fluency Card */}
          <div className="enhanced-metric-card">
            <h4>Fluency <span className="enhanced-score-badge">
              {Math.round(metrics.fluency.score / 30 * 100)}%
            </span></h4>
            <div className="enhanced-metric-bar">
              <div 
                className="enhanced-metric-fill" 
                style={{ 
                  width: `${Math.round(metrics.fluency.score / 30 * 100)}%`,
                  backgroundColor: getScoreColor(metrics.fluency.score, 30)
                }}
              ></div>
            </div>
            <div className="enhanced-metric-details">
              <p>Reading Speed: {metrics.fluency.wpm} WPM</p>
              <p>Ideal Range: {metrics.fluency.idealWpmRange.min}-{metrics.fluency.idealWpmRange.max} WPM</p>
              <p>Pauses: {metrics.fluency.pausesCount}/{metrics.fluency.expectedPauses}</p>
              {metrics.fluency.fillerWords > 0 && (
                <p>Filler Words Detected: {metrics.fluency.fillerWords}</p>
              )}
            </div>
          </div>
          
          {/* Pronunciation Card */}
          <div className="enhanced-metric-card">
            <h4>Pronunciation <span className="enhanced-score-badge">
              {Math.round(metrics.pronunciation.score / 20 * 100)}%
            </span></h4>
            <div className="enhanced-metric-bar">
              <div 
                className="enhanced-metric-fill" 
                style={{ 
                  width: `${Math.round(metrics.pronunciation.score / 20 * 100)}%`,
                  backgroundColor: getScoreColor(metrics.pronunciation.score, 20)
                }}
              ></div>
            </div>
            <div className="enhanced-metric-details">
              {metrics.pronunciation.difficultWords.length > 0 ? (
                <div className="enhanced-detail-item">
                  <p>Challenging words:</p>
                  <div className="enhanced-words-list">
                    {metrics.pronunciation.difficultWords.slice(0, 5).map((word, i) => (
                      <span key={`diff-${i}`} className="enhanced-problem-word">{word}</span>
                    ))}
                    {metrics.pronunciation.difficultWords.length > 5 && <span>...</span>}
                  </div>
                </div>
              ) : (
                <p>Good pronunciation! No major issues detected.</p>
              )}
              <p>Intonation Score: {metrics.pronunciation.intonationScore.toFixed(1)}/10</p>
            </div>
          </div>
          
          {/* Completeness Card */}
          <div className="enhanced-metric-card">
            <h4>Completeness <span className="enhanced-score-badge">
              {Math.round(metrics.completeness.score / 10 * 100)}%
            </span></h4>
            <div className="enhanced-metric-bar">
              <div 
                className="enhanced-metric-fill" 
                style={{ 
                  width: `${Math.round(metrics.completeness.score / 10 * 100)}%`,
                  backgroundColor: getScoreColor(metrics.completeness.score, 10)
                }}
              ></div>
            </div>
            <div className="enhanced-metric-details">
              <p>Coverage: {Math.round(metrics.completeness.coverageRatio * 100)}% of passage</p>
              {metrics.completeness.skippedWords.length > 0 && (
                <div className="enhanced-detail-item">
                  <p>Skipped words: {metrics.completeness.skippedWords.length}</p>
                  {metrics.completeness.skippedWords.length > 0 && (
                    <div className="enhanced-words-list">
                      {metrics.completeness.skippedWords.slice(0, 5).map((item, i) => (
                        <span key={`skip-${i}`} className="enhanced-problem-word">{item.word}</span>
                      ))}
                      {metrics.completeness.skippedWords.length > 5 && <span>...</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Original reading breakdown renderer - preserved for backward compatibility
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
  
  // Render breakdown for listening exercise - preserved from original
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
  
  // Render breakdown for speaking exercise - preserved from original
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

// TranscriptComparison component for detailed text comparison
const TranscriptComparison = ({ originalText, userTranscript, metrics }) => {
  if (!originalText || !userTranscript || !metrics) return null;
  
  // Prepare data for display
  const originalWords = originalText.split(/\s+/);
  const transcriptWords = userTranscript.split(/\s+/);
  
  // Get misspelled words positions
  const misspelledPositions = new Set(
    metrics.accuracy?.misspelledWords?.map(word => word.position) || []
  );
  
  // Get skipped words positions
  const skippedPositions = new Set(
    metrics.completeness?.skippedWords?.map(item => item.position) || []
  );
  
  // Function to style original words
  const getOriginalWordClass = (index) => {
    if (skippedPositions.has(index)) return "skipped-word";
    if (misspelledPositions.has(index)) return "misspelled-word";
    return "";
  };
  
  // Function to style transcript words
  const getTranscriptWordClass = (index) => {
    // Check if this word is an incorrect version of an original word
    const isMisspelled = metrics.accuracy?.misspelledWords?.some(
      word => word.position === index
    ) || false;
    
    // Check if this word is an extra word
    const isExtra = metrics.completeness?.extraWords?.some(
      item => item.position === index
    ) || false;
    
    if (isExtra) return "extra-word";
    if (isMisspelled) return "misspelled-word";
    return "";
  };
  
  return (
    <div className="transcript-comparison">
      <div className="comparison-container">
        <div className="original-text">
          <h4>Original Passage:</h4>
          <p>
            {originalWords.map((word, index) => (
              <span 
                key={`orig-${index}`} 
                className={getOriginalWordClass(index)}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </div>
        
        <div className="user-transcript">
          <h4>Your Reading:</h4>
          <p>
            {transcriptWords.map((word, index) => (
              <span 
                key={`trans-${index}`} 
                className={getTranscriptWordClass(index)}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
      
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color misspelled-word-legend"></span>
          <span>Mispronounced Words</span>
        </div>
        <div className="legend-item">
          <span className="legend-color skipped-word-legend"></span>
          <span>Skipped Words</span>
        </div>
        <div className="legend-item">
          <span className="legend-color extra-word-legend"></span>
          <span>Extra Words</span>
        </div>
      </div>
    </div>
  );
};

export { ScoreBreakdown as default, TranscriptComparison };