import React, { useState, useEffect } from 'react';
import progressService from '../../services/progressService';

const ProgressDebug = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);
        if (!userId) {
          setError('User not logged in');
          return;
        }
        
        const data = await progressService.getUserProgress(userId);
        setProgress(data);
        setError(null);
      } catch (err) {
        console.error('Error loading progress:', err);
        setError('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };
    
    loadProgress();
  }, [userId]);

  return (
    <div className="progress-debug">
      <h2>Progress Debug</h2>
      {loading && <p>Loading progress data...</p>}
      {error && <p className="error">{error}</p>}
      {progress && (
        <div>
          <h3>Learning Progress</h3>
          <div className="debug-section">
            <h4>Softskills</h4>
            <pre>{JSON.stringify(progress.learningProgress.softskills, null, 2)}</pre>
            
            <h4>Sales</h4>
            <pre>{JSON.stringify(progress.learningProgress.sales, null, 2)}</pre>
            
            <h4>Product</h4>
            <pre>{JSON.stringify(progress.learningProgress.product, null, 2)}</pre>
          </div>
          
          <h3>Training Progress</h3>
          <div className="debug-section">
            <h4>Reading ({progress.trainingProgress.reading.length} attempts)</h4>
            <h4>Listening ({progress.trainingProgress.listening.length} attempts)</h4>
            <h4>Speaking ({progress.trainingProgress.speaking.length} attempts)</h4>
            <h4>MCQ ({progress.trainingProgress.mcq.length} attempts)</h4>
            <h4>Completed Levels: {progress.trainingProgress.completedLevels.join(', ') || 'None'}</h4>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .progress-debug {
          padding: 20px;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 5px;
          margin: 20px;
        }
        .debug-section {
          background-color: #fff;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 15px;
        }
        pre {
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 5px;
          overflow-x: auto;
        }
        .error {
          color: red;
        }
      `}</style>
    </div>
  );
};

export default ProgressDebug;