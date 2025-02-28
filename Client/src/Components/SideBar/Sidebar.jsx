import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SideBar.css';
import { MdOutlineDashboard } from "react-icons/md";
import { TbReportSearch } from "react-icons/tb";
import { MdCastForEducation } from "react-icons/md";
import { LuBot } from "react-icons/lu";
import { MdLeaderboard } from "react-icons/md";

const Sidebar = ({ setSection }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine current active section based on path or section state
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('modules')) return 'education';
    if (path.includes('leaderboard')) return 'leaderboard';
    if (path.includes('userTraining')) return 'roleplay';
    if (path.includes('reportlist')) return 'reportlist';
    return 'dashboard'; // default
  };
  
  const currentSection = getCurrentSection();

  const handleRolePlayNavigation = () => {
    navigate('/userTraining');
  };

  const isMobile = window.innerWidth <= 992;
  const handleNavigationForMobile = (section, route) => {
    setSection(section);
    if (isMobile) {
      navigate(route);
    }
  };

  const handleReportListNavigation = () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setSection('reportlist');
      navigate(`/reportlist/${userId}`); 
    } else {
      alert("Please Login First");
    }
  };

  const handleEducationNavigation = () => {
    const userId = localStorage.getItem('userId');
    if(userId){
      setSection('education');
      navigate(`/modules/${userId}`);
    } else {
      alert("Please Login First");
    }
  };

  const handleLeaderboardNavigation = () => {
    navigate("/leaderboard");
  };

  return (
    <nav className="sidebar">
      <ul>
        <li 
          className={currentSection === 'dashboard' ? 'active' : ''} 
          onClick={() => handleNavigationForMobile('dashboard', '/dashboard')}
        >
          <MdOutlineDashboard size={20}/> <span className="icon-text">Home</span>
          <span className="notification-dot"></span>
        </li>
        <li 
          className={currentSection === 'education' ? 'active' : ''} 
          onClick={handleEducationNavigation}
        >
          <MdCastForEducation size={20}/> <span className="icon-text">Courses</span>
          <span className="notification-dot"></span>
        </li>
        <li 
          className={currentSection === 'leaderboard' ? 'active' : ''} 
          onClick={handleLeaderboardNavigation}
        >
          <MdLeaderboard size={20}/> <span className="icon-text">Leaderboard</span>
          <span className="notification-dot"></span>
        </li>
        <li 
          className={currentSection === 'roleplay' ? 'active' : 'has-update'} 
          onClick={handleRolePlayNavigation}
        >
          <LuBot size={20}/> <span className="icon-text">RolePlay</span>
          <span className="notification-dot"></span>
        </li>
        <li 
          className={currentSection === 'reportlist' ? 'active' : ''} 
          onClick={() => handleNavigationForMobile("reportlist", "/reportlist")}
        >
          <TbReportSearch size={20}/> <span className="icon-text">Report</span>
          <span className="notification-dot"></span>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;