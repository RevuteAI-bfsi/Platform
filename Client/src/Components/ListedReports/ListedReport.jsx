import React, { useState } from "react";
import progressService from "../../Services/progressService";
import "./ListedReport.css";

const DetailedScoreBreakdown = ({ metrics }) => {
  if (!metrics) return null;
  return (
    <div className="detailed-score-breakdown">
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
            <span className="detail-label">Score:</span>
            <span className="detail-value">{metrics.passage_complete?.score || 0}/5</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status:</span>
            <span className="detail-value">
              {metrics.passage_complete?.completed ? "Completed" : "Incomplete"}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Time Limit:</span>
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
  const userId = localStorage.getItem("userId");

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

  return (
    <div className="listedreportpage">
      <h1 className="title">Listed Reports</h1>

      <div className="report-menu">
        <div
          className={
            selectedReport === "softskills"
              ? "report-menu-item active"
              : "report-menu-item"
          }
          onClick={() => handleReportClick("softskills")}
        >
          Soft Skills Report
        </div>
        <div
          className={
            selectedReport === "sales"
              ? "report-menu-item active"
              : "report-menu-item"
          }
          onClick={() => handleReportClick("sales")}
        >
          Sales Personal Skills Report
        </div>
        <div
          className={
            selectedReport === "product"
              ? "report-menu-item active"
              : "report-menu-item"
          }
          onClick={() => handleReportClick("product")}
        >
          Product Skills BotReport
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {selectedReport && !loading && (
        <div className="detailed-report-section">
          <h2>
            {selectedReport === "softskills" && "Soft Skills Detailed Report"}
            {selectedReport === "sales" &&
              "Sales Personal Skills Detailed Report"}
            {selectedReport === "product" && "Product Skills Detailed Report"}
          </h2>

          {/* Learning Progress */}
          <div className="module-section">
            <h3>Learning Progress</h3>
            {learningProgress && Object.keys(learningProgress).length > 0 ? (
              <ul className="module-list">
                {Object.keys(learningProgress).map((module) => (
                  <li key={module}>
                    <span className="module-name">{module}</span>:{" "}
                    {learningProgress[module].completed
                      ? "Completed"
                      : "Incomplete"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No learning progress found for this section.</p>
            )}
          </div>

          {/* Soft Skills (Reading & Listening) */}
          {selectedReport === "softskills" && trainingProgress && (
            <>
              {/* Reading Progress */}
              <div className="detail-section">
                <h3>Reading Progress</h3>
                {trainingProgress.reading &&
                Object.keys(trainingProgress.reading).length > 0 ? (
                  Object.entries(trainingProgress.reading).map(
                    ([testId, testData]) => (
                      <div className="reading-test" key={testId}>
                        <h4>{testData.title}</h4>
                        <p>
                          Attempt Count:{" "}
                          {testData.attempts_count ||
                            testData.attempt_count ||
                            0}
                        </p>
                        {testData.metrics && testData.metrics.length > 0 ? (
                          testData.metrics.map((matrix, index) => (
                            <div className="matrix" key={index}>
                              <div>
                                <strong>Timestamp:</strong>{" "}
                                {new Date(matrix.timestamp).toLocaleString()}
                              </div>
                              <div>
                                <strong>Passage Complete:</strong>{" "}
                                {matrix.passage_complete ? "Yes" : "No"}
                              </div>
                              <div>
                                <strong>Within Time Limit:</strong>{" "}
                                {matrix.within_time_limit ? "Yes" : "No"}
                              </div>
                              <div>
                                <strong>WPM:</strong> {matrix.wpm}
                              </div>
                              <div>
                                <strong>Attempt Score:</strong>{" "}
                                {matrix.attempt_score}
                              </div>
                              <div>
                                <strong>Pronunciation Score:</strong>{" "}
                                {matrix.pronunciation_score}
                              </div>
                              <div>
                                <strong>Sentence Pattern Score:</strong>{" "}
                                {matrix.pattern_following_score}
                              </div>
                              <div>
                                <strong>WPM Score:</strong> {matrix.wpm_score}
                              </div>
                              <div>
                                <strong>Missed Words:</strong>{" "}
                                {Array.isArray(matrix.missed_words)
                                  ? matrix.missed_words.join(", ")
                                  : matrix.missed_words}
                              </div>
                              <div>
                                <strong>Overall Score:</strong>{" "}
                                {matrix.overall_score}
                              </div>
                              <div>
                                <strong>Percentage Score:</strong>{" "}
                                {matrix.percentage_score}%
                              </div>
                              <div>
                                <strong>Transcript:</strong>{" "}
                                {matrix.transcript}
                              </div>
                              <div>
                                <strong>Recording Duration:</strong>{" "}
                                {matrix.recording_duration}
                              </div>
                              {matrix.feedback && (
                                <div>
                                  <strong>Feedback:</strong>{" "}
                                  {typeof matrix.feedback === "object"
                                    ? JSON.stringify(matrix.feedback)
                                    : matrix.feedback}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p>No attempts found.</p>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p>No detailed reading progress data available.</p>
                )}
              </div>

              {/* Listening Progress */}
              <div className="detail-section">
                <h3>Listening Progress</h3>
                {trainingProgress.listening &&
                Object.keys(trainingProgress.listening).length > 0 ? (
                  Object.entries(trainingProgress.listening).map(
                    ([testId, testData]) => (
                      <div className="listening-test" key={testId}>
                        <h4>{testData.title}</h4>
                        <p>
                          Attempt Count:{" "}
                          {testData.attempts_count ||
                            testData.attempt_count ||
                            0}
                        </p>
                        {testData.metrics && testData.metrics.length > 0 ? (
                          testData.metrics.map((matrix, index) => (
                            <div className="matrix" key={index}>
                              <div>
                                <strong>Timestamp:</strong>{" "}
                                {new Date(matrix.timestamp).toLocaleString()}
                              </div>
                              <div>
                                <strong>Passage Complete:</strong>{" "}
                                {matrix.passage_complete ? "Yes" : "No"}
                              </div>
                              <div>
                                <strong>Within Time Limit:</strong>{" "}
                                {matrix.within_time_limit ? "Yes" : "No"}
                              </div>
                              <div>
                                <strong>WPM:</strong> {matrix.wpm}
                              </div>
                              <div>
                                <strong>Attempt Score:</strong>{" "}
                                {matrix.attempt_score}
                              </div>
                              <div>
                                <strong>Pronunciation Score:</strong>{" "}
                                {matrix.pronunciation_score}
                              </div>
                              <div>
                                <strong>Sentence Pattern Score:</strong>{" "}
                                {matrix.pattern_following_score}
                              </div>
                              <div>
                                <strong>WPM Score:</strong> {matrix.wpm_score}
                              </div>
                              <div>
                                <strong>Missed Words:</strong>{" "}
                                {Array.isArray(matrix.missed_words)
                                  ? matrix.missed_words.join(", ")
                                  : matrix.missed_words}
                              </div>
                              <div>
                                <strong>Overall Score:</strong>{" "}
                                {matrix.overall_score}
                              </div>
                              <div>
                                <strong>Percentage Score:</strong>{" "}
                                {matrix.percentage_score}%
                              </div>
                              <div>
                                <strong>Transcript:</strong>{" "}
                                {matrix.transcript}
                              </div>
                              <div>
                                <strong>Recording Duration:</strong>{" "}
                                {matrix.recording_duration}
                              </div>
                              {matrix.feedback && (
                                <div>
                                  <strong>Feedback:</strong>{" "}
                                  {typeof matrix.feedback === "object"
                                    ? JSON.stringify(matrix.feedback)
                                    : matrix.feedback}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p>No attempts found.</p>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p>No detailed listening progress data available.</p>
                )}
              </div>
            </>
          )}

          {/* Sales Report (Speaking) */}
          {selectedReport === "sales" &&
            trainingProgress &&
            trainingProgress.salesSpeaking && (
              <div className="detail-section">
                <h3>Sales Speaking Progress</h3>
                {Object.keys(trainingProgress.salesSpeaking).length > 0 ? (
                  Object.entries(trainingProgress.salesSpeaking).map(
                    ([qId, attemptData]) => (
                      <div className="sales-speaking" key={qId}>
                        <h4>{attemptData.question || "Question"}</h4>
                        <p>
                          Attempt Count: {attemptData.attempts_count || 0}
                        </p>
                        {attemptData.metrics &&
                        attemptData.metrics.length > 0 ? (
                          attemptData.metrics.map((matrix, index) => (
                            <div className="matrix" key={index}>
                              <div>
                                <strong>Timestamp:</strong>{" "}
                                {new Date(matrix.timestamp).toLocaleString()}
                              </div>
                              <div>
                                <strong>Overall Score:</strong>{" "}
                                {matrix.overall_score}
                              </div>
                              <div>
                                <strong>Percentage Score:</strong>{" "}
                                {matrix.percentage_score}%
                              </div>
                              <div>
                                <strong>Feedback:</strong>{" "}
                                {typeof matrix.feedback === "object"
                                  ? JSON.stringify(matrix.feedback)
                                  : matrix.feedback}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p>No attempts found.</p>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p>No detailed sales speaking progress available.</p>
                )}
              </div>
            )}

          {/* Product Report */}
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
