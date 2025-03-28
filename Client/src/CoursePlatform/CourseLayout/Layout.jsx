import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';
import { IoMdArrowForward } from "react-icons/io";
import { TiArrowBack } from "react-icons/ti";

const Layout = ({ children, skillType = 'softskills' }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarClickTrigger, setSidebarClickTrigger] = useState(0); // Track sidebar clicks

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const goToDashboard = () => {
    navigate('/elearning');
  };

  const handleSidebarClick = () => {
    setSidebarClickTrigger(prev => prev + 1); // Increment on click
  };

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [sidebarClickTrigger]); // Runs when sidebarClickTrigger changes

  return (
    <div className="layout">
      {/* Pass handleSidebarClick to Sidebar */}
      <Sidebar isOpen={sidebarOpen} skillType={skillType} onSidebarClick={handleSidebarClick} />  
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="header-controls">
          <button className="toggle-sidebar" onClick={toggleSidebar}>
            {sidebarOpen ? <TiArrowBack /> : <IoMdArrowForward />}
          </button>
          <button className="dashboard-button" onClick={goToDashboard}>
            Back to Dashboard
          </button>
        </div>
        <div className="content-container">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
