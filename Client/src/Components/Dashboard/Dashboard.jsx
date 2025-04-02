import React from "react";
import "./Dashboard.css";
import { FaBookOpen, FaChalkboardTeacher, FaClock, FaRobot, FaChartLine, FaUsers, FaBrain, FaHandshake, FaChartBar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleStartLearning = () => {
    navigate('/requestdemo');
  };

  return (
    <div className="dashboard-container-homepage">
      <div className="hero-section">
        <div className="hero-content">
          <FaBookOpen className="hero-icon" />
          <h2 className="Dashboard-Welcome-Text">Welcome to RevuteAI Learning Platform</h2>
          <p className="subtitle">
            Transform your sales team with AI-powered training that delivers measurable results
          </p>
          <button className="cta-button" onClick={handleStartLearning}>
            Start Your Learning Journey
          </button>
        </div>
        
        <div className="value-propositions">
          <div className="value-item">
            <FaRobot className="value-icon" />
            <span>AI-Powered Learning</span>
            <p className="value-description">Practice with intelligent AI agents in realistic scenarios</p>
          </div>
          <div className="value-item">
            <FaChalkboardTeacher className="value-icon" />
            <span>Interactive Training</span>
            <p className="value-description">Engage in dynamic role-plays and practical exercises</p>
          </div>
          <div className="value-item">
            <FaClock className="value-icon" />
            <span>Real-time Feedback</span>
            <p className="value-description">Get instant performance analysis and improvement tips</p>
          </div>
        </div>

        <div className="learning-paths">
          <h3 className="learning-paths-title">Comprehensive Learning Paths</h3>
          <div className="path-grid">
            <div className="path-item">
              <FaChartLine className="path-icon" />
              <h4>Sales Training</h4>
              <ul>
                <li>Advanced telecalling techniques</li>
                <li>Strategic lead conversion</li>
                <li>Objection handling mastery</li>
                <li>Sales psychology & persuasion</li>
              </ul>
              <div className="path-stats">
                <span>✓ 20+ Practice Scenarios</span>
                <span>✓ Real-time AI Feedback</span>
                <span>✓ Performance Analytics</span>
              </div>
            </div>
            <div className="path-item">
              <FaBookOpen className="path-icon" />
              <h4 className="learning-paths-title">Product Knowledge</h4>
              <ul>
                <li>Banking terminologies</li>
                <li>CASA & KYC processes</li>
                <li>Personal loans expertise</li>
                <li>Financial products mastery</li>
              </ul>
              <div className="path-stats">
                <span>✓ Interactive Modules</span>
                <span>✓ Case Studies</span>
                <span>✓ Knowledge Assessments</span>
              </div>
            </div>
            <div className="path-item">
              <FaUsers className="path-icon" />
              <h4>Communication Skills</h4>
              <ul>
                <li>Effective communication</li>
                <li>Active listening techniques</li>
                <li>Professional etiquette</li>
                <li>Customer service excellence</li>
              </ul>
              <div className="path-stats">
                <span>✓ Role-play Exercises</span>
                <span>✓ Voice Analysis</span>
                <span>✓ Improvement Tracking</span>
              </div>
            </div>
          </div>
        </div>

        <div className="social-proof">
          <div className="proof-content">
            <h3>Platform Highlights</h3>
            <p>Experience the future of sales training with our cutting-edge features</p>
            <div className="proof-stats">
              <div className="stat-item">
                <FaBrain className="stat-icon" />
                <span className="stat-label">AI-Powered Practice</span>
                <p className="stat-description">Realistic scenarios with intelligent feedback</p>
              </div>
              <div className="stat-item">
                <FaHandshake className="stat-icon" />
                <span className="stat-label">Interactive Learning</span>
                <p className="stat-description">Engage in dynamic role-plays and exercises</p>
              </div>
              <div className="stat-item">
                <FaChartBar className="stat-icon" />
                <span className="stat-label">Performance Analytics</span>
                <p className="stat-description">Track progress and identify improvement areas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;