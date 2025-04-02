import React from "react";
import "./Dashboard.css";
import { FaBookOpen, FaRegCheckCircle, FaChalkboardTeacher, FaClock } from "react-icons/fa";

import class_taking from "../../images/class_taking.jpeg";
import practice from "../../images/dashboard_practice.jpeg";
import feedback from "../../images/dashboard_feedback.jpeg";

const Dashboard = () => {
  return (
    <div className="dashboard-container-homepage">
      <div className="hero-section">
        <FaBookOpen className="hero-icon" />
        <h2>Start your learning with RevuteAI</h2>

        <div className="value-propositions">
          <div className="value-item">
            <img src={class_taking} alt="Class Taking" />
            <span>Learn how to sell </span>
          </div>
          <div className="value-item">
            <img src={practice} alt="Practice" />
            <span>Practice what you learn</span>
          </div>
          <div className="value-item">
             <img src={feedback} alt="Feedback" />
            <span>Get instant feedback</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;