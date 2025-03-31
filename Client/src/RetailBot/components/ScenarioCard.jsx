import React from 'react';
import './ScenarioCard.css';

function ScenarioCard({ scenario, completionStatus, onSelect }) {
  const getDifficultyClass = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'scenerios-badge-beginner';
      case 'intermediate':
        return 'scenerios-badge-intermediate';
      case 'advanced':
        return 'scenerios-badge-advanced';
      default:
        return '';
    }
  };

  return (
    <div className="scenerios-scenario-card">
      <div className="scenerios-card-header">
        <h3 className="scenerios-card-title">{scenario.title}</h3>
      </div>
      <div className="scenerios-card-body">
        <span className={`scenerios-badge ${getDifficultyClass(scenario.difficulty)}`}>
          {scenario.difficulty}
        </span>
        {completionStatus && completionStatus.completed && (
          <div className="scenerios-completion-info">
            <p className="scenerios-completion-text">Completed</p>
            {completionStatus.bestScore !== null && (
              <p className="scenerios-best-score">Best Score: {completionStatus.bestScore}/100</p>
            )}
          </div>
        )}
        <p className="scenerios-category">Category: {scenario.product_category}</p>
        <p className="scenerios-description">
          "{scenario.scenario_description || scenario.customer_objective}"
        </p>
        <button 
          className="scenerios-btn scenerios-btn-primary scenerios-btn-block"
          onClick={onSelect}
        >
          {completionStatus && completionStatus.completed ? 'Try Again' : 'Start Training'}
        </button>
      </div>
    </div>
  );
}

export default ScenarioCard;
