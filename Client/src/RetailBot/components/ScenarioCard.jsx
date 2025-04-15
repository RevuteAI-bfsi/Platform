import React from 'react';
import './ScenarioCard.css';

function ScenarioCard({ scenario, completionStatus, onSelect }) {
  const getDifficultyClass = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'badge-beginner';
      case 'intermediate':
        return 'badge-intermediate';
      case 'advanced':
        return 'badge-advanced';
      default:
        return '';
    }
  };

  return (
    <div className="scenario-card">
      <div className="card-header">
        <h3 className="card-title">{scenario.title}</h3>
      </div>
      <div className="card-body">
        <span className={`badge ${getDifficultyClass(scenario.difficulty)}`}>
          {scenario.difficulty}
        </span>
        {completionStatus && completionStatus.completed && (
          <div className="completion-info">
            <p className="completion-text">Completed</p>
            {completionStatus.bestScore !== null && (
              <p className="best-score">Best Score: {completionStatus.bestScore}/100</p>
            )}
          </div>
        )}
        <p className="category">Category: {scenario.product_category}</p>
        <p className="description">
          "{scenario.scenario_description || scenario.customer_objective}"
        </p>
        <button 
          className="btn btn-primary btn-block"
          onClick={onSelect}
        >
          {completionStatus && completionStatus.completed ? 'Try Again' : 'Start Training'}
        </button>
      </div>
    </div>
  );
}

export default ScenarioCard;
