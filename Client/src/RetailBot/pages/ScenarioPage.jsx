// ScenarioPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScenarioCard from '../components/ScenarioCard';
import { getAllScenarios, getUserProgress } from '../services/api';
import './ScenarioPage.css';

function ScenarioPage() {
  const [scenarios, setScenarios] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [progressError, setProgressError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    setUserId(currentUserId);
    
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        setProgressError(false);
        const scenariosData = await getAllScenarios();
        let progressData = [];
        try {
          progressData = await getUserProgress(currentUserId);
        } catch (progressErr) {
          console.error('Error fetching user progress:', progressErr);
          setProgressError(true);
        }
        const completionMap = {};
        if (progressData && progressData.length > 0) {
          progressData.forEach(scenario => {
            if (scenario.scenario_id) {
              completionMap[scenario.scenario_id] = {
                completed: scenario.completed || false,
                bestScore: scenario.best_score,
                attempts: scenario.attempts || 0
              };
            }
          });
        }
        const enhancedScenarios = scenariosData.map(scenario => ({
          ...scenario,
          completionStatus: completionMap[scenario.scenario_id] || { completed: false, attempts: 0 }
        }));
        setScenarios(enhancedScenarios);
        setUserProgress(completionMap);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching scenarios:', err);
        setError('Failed to load training scenarios. Please try again later.');
        setLoading(false);
      }
    }

    fetchData();
  }, [navigate]);

  const handleScenarioSelect = (scenarioId) => {
    navigate(`/training/${scenarioId}?userId=${userId}`);
  };

  const handleBack = () => {
    navigate('/landingpage');
  };

  return (
    <div className="RetailSceneriosPage-scenario-page-container">
      <div className="RetailSceneriosPage-page-wrapper">
        <div className="RetailSceneriosPage-header-section">
          <div className="RetailSceneriosPage-header-content">
            <button 
              className="RetailSceneriosPage-btn-back"
              onClick={handleBack}
            >
              <span className="RetailSceneriosPage-back-icon">←</span>
              <span>Back to Dashboard</span>
            </button>
            <h1 className="RetailSceneriosPage-main-title">Training Scenarios</h1>
            <p className="RetailSceneriosPage-subtitle">Enhance your retail communication skills through interactive training scenarios</p>
          </div>
          <div className="RetailSceneriosPage-stats-container">
            <div className="RetailSceneriosPage-stat-card">
              <span className="RetailSceneriosPage-stat-number">{scenarios.length}</span>
              <span className="RetailSceneriosPage-stat-label">Total Scenarios</span>
            </div>
            <div className="RetailSceneriosPage-stat-card">
              <span className="RetailSceneriosPage-stat-number">
                {scenarios.filter(s => s.completionStatus.completed).length}
              </span>
              <span className="RetailSceneriosPage-stat-label">Completed</span>
            </div>
          </div>
        </div>

        {progressError && (
          <div className="RetailSceneriosPage-alert RetailSceneriosPage-alert-error">
            <div className="RetailSceneriosPage-alert-icon">⚠️</div>
            <div className="RetailSceneriosPage-alert-content">
              <h3 className="RetailSceneriosPage-alert-title">Progress Data Unavailable</h3>
              <p className="RetailSceneriosPage-alert-message">Your progress data couldn't be loaded. All scenarios will appear as not completed.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="RetailSceneriosPage-alert RetailSceneriosPage-alert-error">
            <div className="RetailSceneriosPage-alert-icon">❌</div>
            <div className="RetailSceneriosPage-alert-content">
              <h3 className="RetailSceneriosPage-alert-title">Error Loading Scenarios</h3>
              <p className="RetailSceneriosPage-alert-message">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="RetailSceneriosPage-loading-container">
            <div className="RetailSceneriosPage-loading-spinner"></div>
            <p className="RetailSceneriosPage-loading-text">Loading your training scenarios...</p>
          </div>
        ) : (
          <div className="RetailSceneriosPage-content-section">
            {scenarios.length === 0 ? (
              <div className="RetailSceneriosPage-empty-state">
                <div className="RetailSceneriosPage-empty-icon">📚</div>
                <h3 className="RetailSceneriosPage-empty-title">No Scenarios Available</h3>
                <p className="RetailSceneriosPage-empty-message">Please check back later for new training scenarios.</p>
              </div>
            ) : (
              <div className="RetailSceneriosPage-scenarios-grid">
                {scenarios.map(scenario => (
                  <ScenarioCard 
                    key={scenario.scenario_id}
                    scenario={scenario}
                    completionStatus={scenario.completionStatus}
                    onSelect={() => handleScenarioSelect(scenario.scenario_id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScenarioPage;
