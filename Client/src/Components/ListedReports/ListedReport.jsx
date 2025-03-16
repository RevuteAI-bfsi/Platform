import React, { useState } from "react";
import progressService from "../../Services/progressService";
import "./ListedReport.css";

const DetailedScoreBreakdown = ({ metrics }) => {
  if (!metrics) return null;
  return (
    <div className="score-breakdown-card">
      <div className="score-header">
        <h3>Score Breakdown</h3>
        <div className="total-score">
          <div className="score-circle">
            <span className="score-number">{Math.round(metrics.overall_score)}</span>
            <span className="score-max">/9</span>
          </div>
          <div className="score-percentage">{metrics.percentage_score}%</div>
        </div>
      </div>
      <div className="score-category">
        <h4>Passage Completion</h4>
        <div className="category-details">
          <div className="detail-item">
            <span className="detail-label">Score</span>
            <span className="detail-value">{metrics.passage_complete?.score || 0}/5</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              {metrics.passage_complete?.completed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#1E2330" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="#1E2330" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="#1E2330" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </span>
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
  );
};

const ListedReport = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [learningProgress, setLearningProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState({});
  const [loading, setLoading] = useState(false);
  let userId = localStorage.getItem("userId");
  const adminUserId = localStorage.getItem("adminUserId");
  
  if (adminUserId) {
    userId = adminUserId;
  }
  
  

  const handleReportClick = async (reportName) => {
    setSelectedReport(reportName);
    setLoading(true);
    try {
      const data = await progressService.getUserProgress(userId);
      setProfileData(data);
      if (reportName === "softskills") {
        setLearningProgress(data.learningProgress?.softskills || {});
        setTrainingProgress({
          reading: data.trainingProgress?.reading || {},
          listening: data.trainingProgress?.listening || {},
        });
      } else if (reportName === "sales") {
        setLearningProgress(data.learningProgress?.sales || {});
        setTrainingProgress({
          salesSpeaking: data.trainingProgress?.salesSpeaking || {},
        });
      } else if (reportName === "product") {
        setLearningProgress(data.learningProgress?.product || {});
        setTrainingProgress(null);
      }
    } catch (error) {
      console.error("Error fetching user progress:", error);
    }
    setLoading(false);
  };

  const renderAttemptCards = (matrix) => (
    <div className="attempt-container">
      <div className="attempt-info-card">
        <div>
          <strong>Timestamp</strong>: {new Date(matrix.timestamp).toLocaleString()}
        </div>
        <div>
          <strong>Passage Complete</strong>:{" "}
          {matrix.passage_complete ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="#1E2330" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="#1E2330" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="#1E2330" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div>
          <strong>Within Time Limit</strong>: {matrix.within_time_limit ? "Yes" : "No"}
        </div>
        <div>
          <strong>WPM</strong>: {matrix.wpm}
        </div>
        <div>
          <strong>Attempt Score</strong>: {matrix.attempt_score}
        </div>
        <div>
          <strong>Pronunciation Score</strong>: {matrix.pronunciation_score}
        </div>
        <div>
          <strong>Sentence Pattern Score</strong>: {matrix.pattern_following_score}
        </div>
        <div>
          <strong>WPM Score</strong>: {matrix.wpm_score}
        </div>
      </div>
      <div className="attempt-summary-card">
        <div>
          <strong>Overall Score</strong>: {matrix.overall_score}
        </div>
        <div>
          <strong>Percentage Score</strong>: {matrix.percentage_score}%
        </div>
        <div>
          <strong>Recording Duration</strong>: {matrix.recording_duration}
        </div>
      </div>
    </div>
  );

  return (
    <div className="listedreportpage">
      <p className="title">Reports</p>
      <div className="report-menu">
        <div className={`report-menu-item ${selectedReport === "softskills" ? "active" : ""}`} onClick={() => handleReportClick("softskills")}>
          Soft Skills Report
        </div>
        <div className={`report-menu-item ${selectedReport === "sales" ? "active" : ""}`} onClick={() => handleReportClick("sales")}>
          Sales Personal Skills Report
        </div>
        <div className={`report-menu-item ${selectedReport === "product" ? "active" : ""}`} onClick={() => handleReportClick("product")}>
          Product Skills Report
        </div>
        <div className={`report-menu-item ${selectedReport === "telecalling" ? "active" : ""}`} onClick={() => handleReportClick("telecalling")}>
          Telecalling RolePlay Report
        </div>
        <div className={`report-menu-item ${selectedReport === "banking" ? "active" : ""}`} onClick={() => handleReportClick("banking")}>
          Banking RolePlay Report
        </div>
      </div>
      {loading && <div className="loading">Loading...</div>}
      {selectedReport && !loading && (
        <div className="detailed-report-section">
          <h2>
            {selectedReport === "softskills" && "Soft Skills Detailed Report"}
            {selectedReport === "sales" && "Sales Personal Skills Detailed Report"}
            {selectedReport === "product" && "Product Skills Detailed Report"}
            {selectedReport === "telecalling" && "Telecalling RolePlay Detailed Report"}
            {selectedReport === "banking" && "Banking RolePlay Detailed Report"}
          </h2>
          <div className="module-section">
            <h3>Learning Progress</h3>
            {learningProgress && Object.keys(learningProgress).length > 0 ? (
              <div className="learning-progress-cards">
                {Object.keys(learningProgress).map((module) => (
                  <div key={module} className="learning-card">
                    <span className="learning-module">{module}</span>
                    <span className="learning-status">
                      {learningProgress[module].completed ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="#1E2330" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="#1E2330" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="#1E2330" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No learning progress found for this section.</p>
            )}
          </div>
          {selectedReport === "softskills" && trainingProgress && (
            <>
              <div className="detail-section">
                <h3>Reading Progress</h3>
                {trainingProgress.reading && Object.keys(trainingProgress.reading).length > 0 ? (
                  Object.entries(trainingProgress.reading).map(([testId, testData]) => (
                    <div key={testId} className="test-section">
                      <h4>{testData.title}</h4>
                      <p className="attempt-count">Attempt Count: {testData.attempts_count || testData.attempt_count || 0}</p>
                      {testData.metrics && testData.metrics.length > 0 ? (
                        testData.metrics.map((matrix, index) => (
                          <div key={index}>
                            <div className="attempt-number">Attempt {index + 1}</div>
                            {renderAttemptCards(matrix)}
                          </div>
                        ))
                      ) : (
                        <p>No attempts found.</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No detailed reading progress data available.</p>
                )}
              </div>
              <div className="detail-section">
                <h3>Listening Progress</h3>
                {trainingProgress.listening && Object.keys(trainingProgress.listening).length > 0 ? (
                  Object.entries(trainingProgress.listening).map(([testId, testData]) => (
                    <div key={testId} className="test-section">
                      <h4>{testData.title}</h4>
                      <p className="attempt-count">Attempt Count: {testData.attempts_count || testData.attempt_count || 0}</p>
                      {testData.metrics && testData.metrics.length > 0 ? (
                        testData.metrics.map((matrix, index) => (
                          <div key={index}>
                            <div className="attempt-number">{index + 1}</div>
                            {renderAttemptCards(matrix)}
                          </div>
                        ))
                      ) : (
                        <p>No attempts found.</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No detailed listening progress data available.</p>
                )}
              </div>
            </>
          )}
          {selectedReport === "sales" && trainingProgress && trainingProgress.salesSpeaking && (
            <div className="detail-section">
              <h3>Sales Speaking Progress</h3>
              {Object.keys(trainingProgress.salesSpeaking).length > 0 ? (
                Object.entries(trainingProgress.salesSpeaking).map(([qId, attemptData]) => (
                  <div key={qId} className="test-section">
                    <h4>{attemptData.question || "Question"}</h4>
                    <p className="attempt-count">Attempt Count: {attemptData.attempts_count || 0}</p>
                    {attemptData.metrics && attemptData.metrics.length > 0 ? (
                      attemptData.metrics.map((matrix, index) => (
                        <div key={index}>
                          <div className="attempt-number">Attempt {index + 1}</div>
                          {renderAttemptCards(matrix)}
                        </div>
                      ))
                    ) : (
                      <p>No attempts found.</p>
                    )}
                  </div>
                ))
              ) : (
                <p>No detailed sales speaking progress available.</p>
              )}
            </div>
          )}
          {selectedReport === "product" && (
            <div className="detail-section">
              <h3>Product Report</h3>
              <p>No training progress available for product skills.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListedReport;
