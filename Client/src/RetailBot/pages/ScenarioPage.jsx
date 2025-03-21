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
      <header className="RetailSceneriosPage-scenario-header">
        <button 
          className="RetailSceneriosPage-btn-back"
          onClick={handleBack}
        >
          ← Back
        </button>
        <h2 className="RetailSceneriosPage-text-2xl RetailSceneriosPage-font-bold RetailSceneriosPage-text-blue-700">
          Select a Training Scenario
        </h2>
      </header>
      
      {progressError && (
        <div className="RetailSceneriosPage-progress-error-banner">
          <p>Your progress data couldn't be loaded. All scenarios will appear as not completed.</p>
        </div>
      )}

      {error && (
        <div className="RetailSceneriosPage-error">
          <p className="RetailSceneriosPage-text-xl RetailSceneriosPage-text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="RetailSceneriosPage-loading">
          <div className="RetailSceneriosPage-text-xl">
            <span className="RetailSceneriosPage-animate-spin RetailSceneriosPage-h-5 RetailSceneriosPage-w-5 RetailSceneriosPage-mr-2">⏳</span>
            Loading scenarios...
          </div>
        </div>
      ) : (
        <>
          {scenarios.length === 0 ? (
            <div className="RetailSceneriosPage-text-center RetailSceneriosPage-text-gray-600">No scenarios available.</div>
          ) : (
            <div className="RetailSceneriosPage-card-grid">
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
        </>
      )}
    </div>
  );
}

export default ScenarioPage;
