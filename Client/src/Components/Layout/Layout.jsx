import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';
import { IoMdArrowForward } from "react-icons/io";
import { TiArrowBack } from "react-icons/ti";

const Layout = ({ children, skillType = 'softskills' }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const goToDashboard = () => {
    navigate('/landingpage');
  };

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} skillType={skillType} />
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
