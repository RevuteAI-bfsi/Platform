import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import progressService from '../../services/progressService';
import './ProgressLoader.css';

function ProgressLoader({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const preloadProgress = async () => {
      try {
        setIsLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log('No user logged in, skipping progress preload');
          return;
        }
        let skillType = 'softskills';
        if (location.pathname.includes('/sales/')) {
          skillType = 'sales';
        } else if (location.pathname.includes('/product/')) {
          skillType = 'product';
        }
        console.log(`Preloading progress data for skill type: ${skillType}`);
        const data = await progressService.getUserProgress(userId);
        console.log('Progress preloaded successfully');
        if (data?.learningProgress) {
          const moduleProgress = data.learningProgress[skillType] || {};
          const completedTopics = Object.keys(moduleProgress)
            .filter(topic => moduleProgress[topic] && moduleProgress[topic].completed);
          if (completedTopics.length > 0) {
            const existingTopics = JSON.parse(localStorage.getItem(`${skillType}_completed`) || '[]');
            const allTopics = [...new Set([...existingTopics, ...completedTopics])];
            localStorage.setItem(`${skillType}_completed`, JSON.stringify(allTopics));
            console.log(`Stored ${skillType} completed topics in localStorage:`, allTopics);
          }
        }
      } catch (err) {
        console.error('Error preloading progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    preloadProgress();
  }, [location.pathname]);

  return children;
}

export default ProgressLoader;
