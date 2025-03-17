// ScenarioPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScenarioCard from '../components/ScenarioCard';
import { getAllScenarios, getUserProgress } from '../services/api';
import './ScenarioPage.css';
import '../common.css';

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
        
        // Fetch scenarios
        const scenariosData = await getAllScenarios();
        
        // Try to fetch user progress; if it fails, handle the error gracefully
        let progressData = [];
        try {
          progressData = await getUserProgress(currentUserId);
        } catch (progressErr) {
          console.error('Error fetching user progress:', progressErr);
          setProgressError(true);
        }
        
        // Create a map of completion status for each scenario
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
        
        // Merge scenario data with corresponding completion status
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

  // NEW: handleBack function to navigate to /landing
  const handleBack = () => {
    navigate('/landingpage');
  };

  return (
    <div className="scenario-page-container">
      <header className="scenario-header">
        {/* Back button placed before the heading */}
        <button 
          className="btn-back"
          onClick={handleBack}
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-blue-700">
          Select a Training Scenario
        </h2>
      </header>
      
      {progressError && (
        <div className="progress-error-banner">
          <p>Your progress data couldn't be loaded. All scenarios will appear as not completed.</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p className="text-xl text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="text-xl">
            <span className="animate-spin h-5 w-5 mr-2">⏳</span>
            Loading scenarios...
          </div>
        </div>
      ) : (
        <>
          {scenarios.length === 0 ? (
            <div className="text-center text-gray-600">No scenarios available.</div>
          ) : (
            <div className="card-grid">
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
