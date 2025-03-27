import React from "react";
import "./Dashboard.css";
import { FaBookOpen, FaRegCheckCircle, FaChalkboardTeacher, FaClock } from "react-icons/fa";

const Dashboard = () => {
  return (
    <div className="dashboard-container-homepage">
      <div className="hero-section">
        <FaBookOpen className="hero-icon" />
        <h2>Start your learning with RevuteAI</h2>
        
        <div className="value-propositions">
          <div className="value-item">
            <FaRegCheckCircle className="value-icon" />
            <span>Learn the how to sell  </span>
          </div>
          <div className="value-item">
            <FaChalkboardTeacher className="value-icon" />
            <span>Practice what you learn</span>
          </div>
          <div className="value-item">
            <FaClock className="value-icon" />
            <span>Get instant feedback</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;