import React, { useState, useEffect } from "react";
import progressService from "../../Services/progressService";
import "./ListedReport.css";
import {
  MdOutlineAssignment,
  MdOutlineHearing,
  MdOutlineSpeaker,
  MdOutlineShoppingBag,
  MdOutlineHeadsetMic,
  MdOutlineAccountBalance,
} from "react-icons/md";
import { useLocation } from "react-router-dom";

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
          x1="18"
          y1="6"
          x2="6"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )}
  </div>
);

const CircularProgress = ({ value, maxValue, label }) => {
  const percentage = (value / maxValue) * 100;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="circular-progress-container">
      <div className="circular-progress">
        <svg className="progress-svg" viewBox="0 0 100 100">
          <circle className="progress-background" cx="50" cy="50" r={radius} />
          <circle
            className="progress-indicator"
            cx="50"
            cy="50"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="progress-text">
          <span className="score-value">
            {value}/{maxValue}
          </span>
        </div>
      </div>
      <div className="progress-label">
        <span>{label}</span>
      </div>
    </div>
  );
};

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

const RetailAttemptCard = ({ attempt, attemptNumber }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const convertScoreTo10 = (score) => {
    return Math.round(score / 10);
  };
  if (!attempt) return null;
  return (
    <div className="attempt-wrapper">
      <div className="attempt-number">
        Attempt {attemptNumber} - {new Date(attempt.timestamp).toLocaleString()}
      </div>
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
          <div
            className="summary-header"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
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
                <div key={index} className="suggestion-item">
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
              <span className="detail-value">
                {metrics.passage_complete?.score || 0}/5
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <StatusIndicator
                completed={metrics.passage_complete?.completed}
              />
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

const TestSection = ({ testData }) => {
  const [expanded, setExpanded] = useState(false);
  if (!testData) return null;
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const getBestScore = (metrics) => {
    if (!metrics || metrics.length === 0) return null;
    return Math.max(...metrics.map((m) => m.overall_score));
  };
  const bestScore = getBestScore(testData.metrics);
  return (
    <div className="test-section">
      <div className="test-header" onClick={() => setExpanded(!expanded)}>
        <div className="test-info">
          <h4>{testData.title || "Test"}</h4>
          <span className="attempt-count">
            {testData.attempts_count || testData.attempt_count || 0} attempts
            {bestScore !== null && ` • Best Score: ${bestScore}/9`}
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
      <div className={`test-content ${expanded ? "expanded" : ""}`}>
        {testData.metrics && testData.metrics.length > 0 ? (
          <div className="attempts-container">
            {testData.metrics.map((metrics, index) => (
              <AttemptCard
                key={index}
                metrics={metrics}
                attemptNumber={testData.metrics.length - index}
                testTitle={testData.title}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="no-data-message">No attempts recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AttemptCard = ({ metrics, attemptNumber, testTitle }) => {
  const [expanded, setExpanded] = useState(false);
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  return (
    <div className="attempt-wrapper">
      <div className="attempt-number" onClick={() => setExpanded(!expanded)}>
        <span className="attempt-info">
          <span className="attempt-label">Attempt</span>
          <span className="attempt-value">{attemptNumber}</span>
          <span className="attempt-date">{formatDate(metrics.timestamp)}</span>
        </span>
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
        <div className="attempt-card">
          <div className="metric-box">
            <div className="metric-box-header">
              <div className="metric-box-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h4>Attempt Details</h4>
            </div>
            <div className="metric-grid">
              <div className="metric-item">
                <span className="metric-label">Date & Time</span>
                <span className="metric-value">{formatDate(metrics.timestamp)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Duration</span>
                <span className="metric-value">{metrics.recording_duration}s</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Passage Complete</span>
                <StatusIndicator completed={metrics.passage_complete} />
              </div>
              <div className="metric-item">
                <span className="metric-label">Time Limit</span>
                <StatusIndicator completed={metrics.within_time_limit} />
              </div>
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-box-header">
              <div className="metric-box-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h4>Performance Metrics</h4>
            </div>
            <div className="metric-grid">
              <div className="metric-item">
                <span className="metric-label">WPM</span>
                <span className="metric-value">{metrics.wpm}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">WPM Score</span>
                <span className="metric-value">{metrics.wpm_score}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Pronunciation</span>
                <span className="metric-value">{metrics.pronunciation_score}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Pattern Score</span>
                <span className="metric-value">{metrics.pattern_following_score}</span>
              </div>
            </div>
          </div>
          <div className="summary-box">
            <div className="summary-header">
              <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Summary
              </h4>
            </div>
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
      )}
    </div>
  );
};

const ProgressSection = ({ title, data, renderFunction }) => {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="progress-section">
        <div className="section-header">
          <h3>{title}</h3>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <MdOutlineAssignment size={48} />
          </div>
          <p className="no-data-message">No data available for this section.</p>
        </div>
      </div>
    );
  }
  const filteredData =
    activeTab === "all"
      ? data
      : Object.fromEntries(
          Object.entries(data).filter(([_, value]) => {
            const attempts = value.metrics?.length || 0;
            if (activeTab === "completed") {
              return attempts >= 3;
            } else if (activeTab === "pending") {
              return attempts > 0 && attempts < 3;
            }
            return true;
          })
        );
  const counts = {
    all: Object.keys(data).length,
    completed: Object.values(data).filter(
      (value) => (value.metrics?.length || 0) >= 3
    ).length,
    pending: Object.values(data).filter((value) => {
      const attempts = value.metrics?.length || 0;
      return attempts > 0 && attempts < 3;
    }).length,
  };
  return (
    <div className="progress-section">
      <div className="section-header">
        <div className="header-content" onClick={() => setExpanded(!expanded)}>
          <div className="header-left">
            <h3>{title}</h3>
            <span className="data-count">{counts.all} items</span>
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
          <div className="section-tabs">
            <button
              className={`tab-button ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All ({counts.all})
            </button>
            <button
              className={`tab-button ${
                activeTab === "completed" ? "active" : ""
              }`}
              onClick={() => setActiveTab("completed")}
            >
              Completed ({counts.completed})
            </button>
            <button
              className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              Pending ({counts.pending})
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div className="section-content">{renderFunction(filteredData)}</div>
      )}
    </div>
  );
};

const ListedReport = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [learningProgress, setLearningProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState({});
  const [retailTrainingData, setRetailTrainingData] = useState(null);
  const [loading, setLoading] = useState(false);
  // let userId = localStorage.getItem("userId");
  // const personUserId = localStorage.getItem("personUserId");
  // if (personUserId) {
  //   userId = personUserId;
  // }

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const userId = params.get("userId");

  const reportOptions = [
    {
      id: "softskills",
      label: "Soft Skills",
      icon: <MdOutlineAssignment size={20} />,
    },
    {
      id: "sales",
      label: "Sales Skills",
      icon: <MdOutlineSpeaker size={20} />,
    },
    {
      id: "product",
      label: "Product Skills",
      icon: <MdOutlineShoppingBag size={20} />,
    },
    {
      id: "RetailBot",
      label: "RetailBot",
      icon: <MdOutlineAccountBalance size={20} />,
    },
  ];
  const handleReportClick = async (reportId) => {
    setSelectedReport(reportId);
    setLoading(true);
    try {
      if (reportId === "RetailBot") {
        const retailData = await progressService.getUserRetailTraining(userId);
        setRetailTrainingData(retailData);
      } else {
        const data = await progressService.getUserProgress(userId);
        setProfileData(data);
        switch (reportId) {
          case "softskills":
            setLearningProgress(data.learningProgress?.softskills || {});
            setTrainingProgress({
              reading: data.trainingProgress?.reading || {},
              listening: data.trainingProgress?.listening || {},
              speaking: data.trainingProgress?.speaking || {},
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
  useEffect(() => {
    if (reportOptions.length > 0 && !selectedReport) {
      handleReportClick(reportOptions[0].id);
    }
  }, []);
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
      {console.log(progress)}
    </div>
  );
  const renderRetailScenarios = (scenarios) => (
    <div className="training-tests">
      {scenarios.map((scenario) => (
        <RetailScenarioCard key={scenario.scenario_id} scenario={scenario} />
      ))}
    </div>
  );
  const LearningProgressBar = ({ progress }) => {
    const modules = Object.keys(progress);
    if (modules.length === 0) {
      return (
        <p className="no-data-message">
          No learning progress found for this section.
        </p>
      );
    }
    const completedModules = modules.filter((module) => progress[module].completed)
      .length;
    const overallProgress = (completedModules / modules.length) * 100;
    return (
      <div className="learning-progress-container">
        <div className="overall-progress-card">
          <div className="progress-header">
            <h4>Overall Progress</h4>
            <span className="progress-percentage">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
        <div className="steps-progress-bar">
          <div className="progress-line-container">
            <div className="progress-line" />
          </div>
          <div className="progress-steps">
            {modules.map((module, index) => {
              const completed = progress[module].completed;
              const isLast = index === modules.length - 1;
              return (
                <div
                  key={module}
                  className={`progress-step ${completed ? "completed" : ""} ${
                    isLast ? "last" : ""
                  }`}
                >
                  <div className="progress-dot-wrapper">
                    <div
                      className={`progress-dot ${completed ? "completed" : ""}`}
                    />
                    {!isLast && (
                      <div
                        className={`progress-connector ${
                          completed ? "completed" : ""
                        }`}
                      />
                    )}
                  </div>
                  <div className="progress-step-text">
                    <span className="progress-label">{module}</span>
                    <span className="progress-status">
                      {completed ? "Completed" : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="progress-summary">
          <div className="summary-item">
            <span className="summary-label">Completed Modules</span>
            <span className="summary-value">{completedModules}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Modules</span>
            <span className="summary-value">{modules.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Remaining</span>
            <span className="summary-value">
              {modules.length - completedModules}
            </span>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="listedreportpage">
      <div className="ListedReport-infoSection">
        {/* <button className="back-button-reportPage" onClick={() => window.location.href="/landingpage"}></button> */}
        <h1 className="title">Performance Reports</h1>
      </div>
      <div className="reportsection-display">
        <div className="report-menu">
          {reportOptions.map((report) => (
            <div
              key={report.id}
              className={`report-menu-item ${
                selectedReport === report.id ? "active" : ""
              }`}
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
              {selectedReport === "sales" &&
                "Sales Personal Skills Detailed Report"}
              {selectedReport === "product" && "Product Skills Detailed Report"}
              {selectedReport === "RetailBot" && "RetailBot Training Report"}
            </h2>
            {selectedReport === "RetailBot" ? (
              retailTrainingData &&
              retailTrainingData.scenarios &&
              retailTrainingData.scenarios.length > 0 ? (
                <div className="retail-training-content">
                  <div className="detail-section">
                    <h3>Retail Scenarios</h3>
                    {renderRetailScenarios(retailTrainingData.scenarios)}
                  </div>
                </div>
              ) : (
                <p className="no-data-message">
                  No retail training data available.
                </p>
              )
            ) : (
              <>
                <div className="module-section">
                  <h3>Learning Progress</h3>
                  <LearningProgressBar progress={learningProgress} />
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
                    <p className="no-data-message">
                      No training progress available for product skills.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ListedReport;
