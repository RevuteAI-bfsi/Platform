import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import progressService from '../../services/progressService';
import './ProgressLoader.css';

/**
 * ProgressLoader component
 * Preloads user progress data before rendering child components
 * Ensures consistent state during navigation between pages
 */
function ProgressLoader({ children }) {
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    const preloadProgress = async () => {
      try {
        setIsLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log('No user logged in, skipping progress preload');
          setIsProgressLoaded(true);
          setIsLoading(false);
          return;
        }
        
        // Extract skill type from URL
        let skillType = 'softskills'; // default
        if (location.pathname.includes('/sales/')) {
          skillType = 'sales';
        } else if (location.pathname.includes('/product/')) {
          skillType = 'product';
        }
        
        console.log(`Preloading progress data for skill type: ${skillType}`);
        const data = await progressService.getUserProgress(userId);
        console.log('Progress preloaded successfully');
        
        // Store completed topics in localStorage as fallback
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
        
        setIsProgressLoaded(true);
      } catch (err) {
        console.error('Error preloading progress:', err);
        // Still mark as loaded to avoid blocking UI
        setIsProgressLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    preloadProgress();
  }, [location.pathname]);
  
  if (isLoading) {
    return (
      <div className="progress-loader">
        <div className="loader-spinner"></div>
        <p>Loading your progress...</p>
      </div>
    );
  }
  
  return isProgressLoaded ? children : null;
}

export default ProgressLoader;