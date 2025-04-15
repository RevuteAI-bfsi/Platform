import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Leaderboard.css";
import { FaTrophy, FaMedal, FaArrowLeft, FaCrown } from "react-icons/fa";

const LocalURL = "http://localhost:8000/api"

const Leaderboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`${LocalURL}/leaderboard/fetchUser-leaderBoard`);
        let leaderboardData = response.data;
        const currentAdmin = localStorage.getItem("adminName");
        if (currentAdmin) {
          leaderboardData = leaderboardData.filter(user => user.adminName === currentAdmin);
        }
        leaderboardData.sort((a, b) => b.overallScore - a.overallScore);
        setUsers(leaderboardData);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      }
    };
    fetchLeaderboard();
  }, []);

  const getMedalColor = (index) => {
    switch (index) {
      case 0: return "#FFD700"; // Gold
      case 1: return "#C0C0C0"; // Silver
      case 2: return "#CD7F32"; // Bronze
      default: return "#4A90E2"; // Default blue
    }
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <button className="back-button" onClick={() => window.location.href="/landingpage"}>
            <FaArrowLeft /> Back to Dashboard
          </button>
          <div className="title-container">
            <FaTrophy className="trophy-icon" />
            <h2>Leaderboard</h2>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-value">{users.length}</span>
              <span className="stat-label">Total Participants</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{users[0]?.overallScore.toFixed(2) || '0'}</span>
              <span className="stat-label">Highest Score</span>
            </div>
          </div>
        </div>
        
        <div className="leaderboard-content">
          {users.map((user, index) => (
            <div 
              key={user.userId} 
              className={`leaderboard-card ${index < 3 ? 'top-three' : ''}`}
              style={{ borderColor: getMedalColor(index) }}
            >
              <div className="rank-container">
                {index === 0 ? (
                  <FaCrown className="crown-icon" style={{ color: getMedalColor(index) }} />
                ) : index < 3 ? (
                  <FaMedal className="medal-icon" style={{ color: getMedalColor(index) }} />
                ) : (
                  <span className="rank-number">{index + 1}</span>
                )}
              </div>
              <div className="user-info">
                <div className="user-details">
                  <h3 className="username">{user.username}</h3>
                  <span className="rank-text">Rank #{index + 1}</span>
                </div>
                <div className="score-container">
                  <span className="score-label">Score</span>
                  <span className="score-value">{user.overallScore.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
