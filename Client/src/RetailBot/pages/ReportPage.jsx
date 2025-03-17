import React, { useState, useEffect } from 'react';
import { useParams, useNavigate ,useLocation} from 'react-router-dom';
import { getPerformanceReport } from '../services/api';
import './ReportPage.css'; // Import the separate CSS file
import '../common.css';


function ReportPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('userId') || localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  
  useEffect(() => {
    async function fetchReport() {
      if (!conversationId) {
        setError('No conversation ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const data = await getPerformanceReport(conversationId);
        setReport(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to generate performance report. Please try again.');
        setLoading(false);
      }
    }
    
    fetchReport();
  }, [conversationId, userId]);
  
  const handleTryAgain = () => {
    // Go back to scenario selection
    navigate('/userTraining');
  };
  
  const handleDownloadReport = () => {
    // Create a downloadable report
    if (!report) return;
    
    const reportText = `
SALES TRAINING PERFORMANCE REPORT
---------------------------------

OVERALL SCORE: ${report.overall_score}/100

CATEGORY SCORES:
- Grammar: ${report.category_scores.grammar || report.category_scores.communication}/100
- Customer Handling: ${report.category_scores.customer_handling || report.category_scores.customer_respect}/100

IMPROVEMENT SUGGESTIONS:
${report.improvement_suggestions.map((sugg, i) => `${i+1}. ${sugg}`).join('\n')}
`;
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Helper function to convert 0-100 score to 0-10 scale
  const convertScoreTo10 = (score) => {
    return Math.round(score / 10);
  };
  
  // CircularProgress component
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
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">
          <span className="loading-icon">
            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          Generating your performance report...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button 
          onClick={handleTryAgain}
          className="button button-primary"
        >
          Return to Scenarios
        </button>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="error-container">
        <div className="error-message">Could not generate report. Please try again.</div>
        <button 
          onClick={handleTryAgain}
          className="button button-primary"
        >
          Return to Scenarios
        </button>
      </div>
    );
  }
  
  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Report</h2>
      </div>
      
      <div className="report-body">
        {/* Circular Progress Indicators */}
        <div className="progress-indicators">
          {/* Overall Score Circle */}
          <CircularProgress 
            value={convertScoreTo10(report.overall_score)} 
            maxValue={10} 
            label="Overall" 
          />
          
          {/* Grammar Score Circle (mapped from communication or grammar) */}
          <CircularProgress 
            value={convertScoreTo10(report.category_scores.grammar || report.category_scores.communication)} 
            maxValue={10} 
            label="Grammar" 
          />
          
          {/* Customer Handling Score Circle (mapped from customer_respect or customer_handling) */}
          <CircularProgress 
            value={convertScoreTo10(report.category_scores.customer_handling || report.category_scores.customer_respect)} 
            maxValue={10} 
            label="Customer Handling" 
          />
        </div>
        
        {/* Suggestions Section */}
        <div className="suggestions-container">
          <h3 className="suggestions-title">Suggestions</h3>
          <ul className="suggestions-list">
            {report.improvement_suggestions.map((suggestion, index) => (
              <li key={index} className="suggestion-item">{suggestion}</li>
            ))}
          </ul>
        </div>
        
        {/* Actions */}
        <div className="actions-container">
          <button 
            className="button button-primary"
            onClick={handleDownloadReport}
          >
            Download Report
          </button>
          
          <button 
            className="button button-secondary"
            onClick={handleTryAgain}
          >
            Try Another Scenario
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportPage;