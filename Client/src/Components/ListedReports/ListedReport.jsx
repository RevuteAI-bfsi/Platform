import React, { useState, useEffect } from "react";
import progressService from "../../Services/progressService";
import "./ListedReport.css";
import { MdOutlineAssignment, MdOutlineHearing, MdOutlineSpeaker, MdOutlineShoppingBag, MdOutlineHeadsetMic, MdOutlineAccountBalance } from "react-icons/md";

// Score badge component with color coding based on score percentage
const ScoreBadge = ({ score, maxScore }) => {
  const percentage = (score / maxScore) * 100;
  let badgeClass = "score-badge";
  
  if (percentage >= 80) badgeClass += " excellent";
  else if (percentage >= 60) badgeClass += " good";
  else if (percentage >= 40) badgeClass += " average";
  else badgeClass += " needs-improvement";
  
  return (
    <div className={badgeClass}>
      <span className="score-value">{score}</span>
      <span className="score-max">/{maxScore}</span>
    </div>
  );
};

// Status indicator component (checkmark or x)
const StatusIndicator = ({ completed }) => (
  <div className={`status-indicator ${completed ? "completed" : "incomplete"}`}>
    {completed ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path 
          d="M20 6L9 17L4 12" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <line 
          x1="18" y1="6" x2="6" y2="18" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        <line 
          x1="6" y1="6" x2="18" y2="18" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </svg>
    )}
  </div>
);

// Circular progress component for RetailBot scores
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

// RetailBot retail scenario card component
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

// RetailBot attempt card component
const RetailAttemptCard = ({ attempt, attemptNumber }) => {
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
          <div className="progress-indicators">
            <CircularProgress 
              value={convertScoreTo10(attempt.overall_score)} 
              maxValue={10} 
              label="Overall" 
            />
            <CircularProgress 
              value={convertScoreTo10(attempt.grammar_score)} 
              maxValue={10} 
              label="Grammar" 
            />
            <CircularProgress 
              value={convertScoreTo10(attempt.customer_handling_score)} 
              maxValue={10} 
              label="Customer" 
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

// Other components from your existing code remain the same
const DetailedScoreBreakdown = ({ metrics }) => {
  if (!metrics) return null;
  
  return (
    <div className="score-breakdown-card">
      <div className="score-header">
        <h3>Score Breakdown</h3>
        <div className="total-score">
          <ScoreBadge score={Math.round(metrics.overall_score)} maxScore={9} />
          <div className="score-percentage">{metrics.percentage_score}%</div>
        </div>
      </div>
      
      <div className="score-categories">
        <div className="score-category">
          <h4>Passage Completion</h4>
          <div className="category-details">
            <div className="detail-item">
              <span className="detail-label">Score</span>
              <span className="detail-value">{metrics.passage_complete?.score || 0}/5</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <StatusIndicator completed={metrics.passage_complete?.completed} />
            </div>
            <div className="detail-item">
              <span className="detail-label">Time Limit</span>
              <span className="detail-value">
                {metrics.passage_complete?.within_time_limit ? "Within Limit" : "Exceeded"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LearningModuleCard = ({ moduleName, completed }) => (
  <div className={`learning-card ${completed ? "completed" : ""}`}>
    <span className="learning-module">{moduleName}</span>
    <StatusIndicator completed={completed} />
  </div>
);

const AttemptCard = ({ metrics, attemptNumber }) => (
  <div className="attempt-wrapper">
    {attemptNumber && <div className="attempt-number">Attempt {attemptNumber}</div>}
    <div className="attempt-card">
      <div className="attempt-metrics">
        <div className="metric-group">
          <h4>Attempt Details</h4>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Timestamp</span>
              <span className="metric-value">{new Date(metrics.timestamp).toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Recording Duration</span>
              <span className="metric-value">{metrics.recording_duration}s</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Passage Complete</span>
              <StatusIndicator completed={metrics.passage_complete} />
            </div>
            <div className="metric-item">
              <span className="metric-label">Within Time Limit</span>
              <StatusIndicator completed={metrics.within_time_limit} />
            </div>
          </div>
        </div>
        
        <div className="metric-group">
          <h4>Performance Metrics</h4>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">WPM</span>
              <span className="metric-value">{metrics.wpm}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">WPM Score</span>
              <span className="metric-value">{metrics.wpm_score}</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Pronunciation Score</span>
              <span className="metric-value">{metrics.pronunciation_score}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Pattern Score</span>
              <span className="metric-value">{metrics.pattern_following_score}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="attempt-summary">
        <h4>Summary</h4>
        <div className="summary-metrics">
          <div className="summary-metric">
            <span className="summary-label">Overall Score</span>
            <ScoreBadge score={metrics.overall_score} maxScore={9} />
          </div>
          <div className="summary-metric">
            <span className="summary-label">Percentage</span>
            <div className="percentage-badge">{metrics.percentage_score}%</div>
          </div>
          <div className="summary-metric">
            <span className="summary-label">Attempt Score</span>
            <span className="summary-value">{metrics.attempt_score}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TestSection = ({ testData }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!testData) return null;
  
  return (
    <div className="test-section">
      <div className="test-header" onClick={() => setExpanded(!expanded)}>
        <div className="test-info">
          <h4>{testData.title || "Test"}</h4>
          <span className="attempt-count">
            {testData.attempts_count || testData.attempt_count || 0} attempts
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
          {testData.metrics && testData.metrics.length > 0 ? (
            <div className="attempts-container">
              {testData.metrics.map((metrics, index) => (
                <AttemptCard 
                  key={index} 
                  metrics={metrics} 
                  attemptNumber={index + 1} 
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

const ProgressSection = ({ title, data, renderFunction }) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="progress-section">
        <div className="section-header">
          <h3>{title}</h3>
        </div>
        <p className="no-data-message">No data available for this section.</p>
      </div>
    );
  }
  
  return (
    <div className="progress-section">
      <div className="section-header" onClick={() => setExpanded(!expanded)}>
        <h3>{title}</h3>
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
        <div className="section-content">
          {renderFunction(data)}
        </div>
      )}
    </div>
  );
};

// Main reports component
const ListedReport = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [learningProgress, setLearningProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState({});
  const [retailTrainingData, setRetailTrainingData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Get user ID (from localStorage or admin user ID)
  let userId = localStorage.getItem("userId");
  const adminUserId = localStorage.getItem("adminUserId");
  
  if (adminUserId) {
    userId = adminUserId;
  }
  
  // Report options with icons - using React icons for consistency with your navigation
  const reportOptions = [
    { id: "softskills", label: "Soft Skills", icon: <MdOutlineAssignment size={20} /> },
    { id: "sales", label: "Sales Skills", icon: <MdOutlineSpeaker size={20} /> },
    { id: "product", label: "Product Skills", icon: <MdOutlineShoppingBag size={20} /> },
    { id: "RetailBot", label: "RetailBot", icon: <MdOutlineAccountBalance size={20} /> }
  ];
  
  // Handle report selection
  const handleReportClick = async (reportId) => {
    setSelectedReport(reportId);
    setLoading(true);
    
    try {
      if (reportId === "RetailBot") {
        // Fetch retail training data
        const retailData = await progressService.getUserRetailTraining(userId);
        setRetailTrainingData(retailData);
      } else {
        // Existing data fetching code for other report types
        const data = await progressService.getUserProgress(userId);
        setProfileData(data);
        
        // Set appropriate data based on report type
        switch (reportId) {
          case "softskills":
            setLearningProgress(data.learningProgress?.softskills || {});
            setTrainingProgress({
              reading: data.trainingProgress?.reading || {},
              listening: data.trainingProgress?.listening || {},
              speaking: data.trainingProgress?.speaking || {}
            });
            break;
            
          case "sales":
            setLearningProgress(data.learningProgress?.sales || {});
            setTrainingProgress({
              salesSpeaking: data.trainingProgress?.salesSpeaking || {},
            });
            break;
            
          case "product":
            setLearningProgress(data.learningProgress?.product || {});
            setTrainingProgress(null);
            break;
            
          default:
            setLearningProgress({});
            setTrainingProgress({});
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    
    setLoading(false);
  };
  
  // Auto-select first report option on component mount
  useEffect(() => {
    if (reportOptions.length > 0 && !selectedReport) {
      handleReportClick(reportOptions[0].id);
    }
  }, []);
  
  // Render functions
  const renderLearningProgress = (progress) => (
    <div className="learning-progress-cards">
      {Object.keys(progress).map((module) => (
        <LearningModuleCard 
          key={module} 
          moduleName={module} 
          completed={progress[module].completed} 
        />
      ))}
    </div>
  );
  
  const renderTrainingProgress = (progress) => (
    <div className="training-tests">
      {Object.entries(progress).map(([testId, testData]) => (
        <TestSection key={testId} testData={testData} />
      ))}
    </div>
  );
  
  // New render function for RetailBot scenarios
  const renderRetailScenarios = (scenarios) => (
    <div className="training-tests">
      {scenarios.map((scenario) => (
        <RetailScenarioCard key={scenario.scenario_id} scenario={scenario} />
      ))}
    </div>
  );
  
  return (
    <div className="listedreportpage">
      <h1 className="title">Performance Reports</h1>
      
      {/* Report menu */}
      <div className="report-menu">
        {reportOptions.map((report) => (
          <div 
            key={report.id}
            className={`report-menu-item ${selectedReport === report.id ? "active" : ""}`} 
            onClick={() => handleReportClick(report.id)}
          >
            <span className="report-icon">{report.icon}</span>
            <span>{report.label}</span>
          </div>
        ))}
      </div>
      
      {loading ? (
        <div className="loading">Loading...</div>
      ) : selectedReport ? (
        <div className="detailed-report-section">
          <h2>
            {selectedReport === "softskills" && "Soft Skills Detailed Report"}
            {selectedReport === "sales" && "Sales Personal Skills Detailed Report"}
            {selectedReport === "product" && "Product Skills Detailed Report"}
            {selectedReport === "RetailBot" && "RetailBot Training Report"}
            {/* {selectedReport === "banking" && "Banking RolePlay Detailed Report"} */}
          </h2>
          
          {selectedReport === "RetailBot" ? (
            // RetailBot specific content
            retailTrainingData && retailTrainingData.scenarios && retailTrainingData.scenarios.length > 0 ? (
              <div className="retail-training-content">
                <div className="detail-section">
                  <h3>Retail Scenarios</h3>
                  {renderRetailScenarios(retailTrainingData.scenarios)}
                </div>
              </div>
            ) : (
              <p className="no-data-message">No retail training data available.</p>
            )
          ) : (
            // Existing content for other report types
            <>
              <div className="module-section">
                <h3>Learning Progress</h3>
                {learningProgress && Object.keys(learningProgress).length > 0 ? (
                  renderLearningProgress(learningProgress)
                ) : (
                  <p className="no-data-message">No learning progress found for this section.</p>
                )}
              </div>
          
              {selectedReport === "softskills" && trainingProgress && (
                <>
                  <ProgressSection 
                    title="Reading Progress" 
                    data={trainingProgress.reading} 
                    renderFunction={renderTrainingProgress} 
                  />
                  <ProgressSection 
                    title="Listening Progress" 
                    data={trainingProgress.listening} 
                    renderFunction={renderTrainingProgress} 
                  />
                  <ProgressSection 
                    title="speaking Progress"
                    data={trainingProgress.speaking} 
                    renderFunction={renderTrainingProgress} 
                  />
                </>
              )}
              
              {selectedReport === "sales" && trainingProgress && (
                <ProgressSection 
                  title="Sales Speaking Progress" 
                  data={trainingProgress.salesSpeaking} 
                  renderFunction={renderTrainingProgress} 
                />
              )}
              
              {selectedReport === "product" && (
                <div className="detail-section">
                  <h3>Product Report</h3>
                  <p className="no-data-message">No training progress available for product skills.</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ListedReport;