import React, { useState, useEffect } from "react";
import Navbar from "../Navbar/Navbar";
import Sidebar from "../SideBar/Sidebar";
import Dashboard from "../Dashboard/Dashboard";
// import Task1 from "../Task1/Task1";
// import Task2 from "../Task2/Task2";
import './LandingPage.css'
import ListedReport from "../ListedReports/ListedReport";
// import Module from "../ModulesPage/Module";

const LandingPage = () => {
  const [section, setSection] = useState("dashboard");

  useEffect(() => {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbarHomepage-container');
    const sidebar = document.querySelector('.sidebar');
    const mainBody = document.querySelector('.main-body');
    
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // If scrolling down and past 100px threshold
      if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Hide both navbar and sidebar
        if (navbar) navbar.style.transform = 'translateY(-100%)';
        if (sidebar) sidebar.classList.add('hidden');
        if (mainBody) mainBody.style.marginTop = '0';
      } 
      // If scrolling up
      else if (scrollTop < lastScrollTop) {
        // Show both navbar and sidebar
        if (navbar) navbar.style.transform = 'translateY(0)';
        if (sidebar) sidebar.classList.remove('hidden');
        if (mainBody) mainBody.style.marginTop = '110px';
      }
      
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For mobile or negative scrolling
    };
    
    // Add styles to navbar for smooth transitions
    if (navbar) {
      navbar.style.transition = 'transform 0.3s ease';
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const renderSection = () => {
    switch (section) {
      case "dashboard":
        return <Dashboard />;
      case `Courses`:
        return <Module />;
      case "reportlist":
        return <ListedReport/>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="layout-container">
      <Navbar />

      <div className="main-body">
        {/* Sidebar is now placed between navbar and content */}
        <Sidebar setSection={setSection} />
        <div className="center-content">{renderSection()}</div>
      </div>
    </div>
  );
};

export default LandingPage;