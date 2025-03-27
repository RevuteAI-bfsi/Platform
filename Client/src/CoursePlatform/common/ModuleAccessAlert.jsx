// src/components/common/ModuleAccessAlert.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModuleAccessAlert.css';

const ModuleAccessAlert = ({ message, redirectPath, onClose }) => {
  const navigate = useNavigate();
  
  const handleRedirect = () => {
    if (redirectPath) {
      navigate(redirectPath);
    }
    if (onClose) onClose();
  };
  
  return (
    <div className="module-access-alert-overlay">
      <div className="module-access-alert">
        <div className="module-access-alert-icon">⚠️</div>
        <h3>Module Access Restricted</h3>
        <p>{message}</p>
        <div className="module-access-alert-buttons">
          <button 
            className="module-access-alert-redirect"
            onClick={handleRedirect}
          >
            {redirectPath ? 'Go to Required Module' : 'Close'}
          </button>
          {redirectPath && (
            <button 
              className="module-access-alert-close"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleAccessAlert;