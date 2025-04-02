import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import Chart from "chart.js/auto";
import { MdDashboardCustomize } from "react-icons/md";
import { FaRegUser } from "react-icons/fa";
import { MdLeaderboard } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { IoMdLogOut } from "react-icons/io";
import "./AdminPannel.css";
import progressService from "../../Services/progressService";

const AdminPannel = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [username, setUserName] = useState("Admin");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState("softskills");
  const [learningProgress, setLearningProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const navigate = useNavigate();
  const adjacencyMap = {
    Sample: { first: null, second: "Dashboard" },
    Dashboard: { first: "Sample", second: "Users" },
    Users: { first: "Dashboard", second: "LeaderBoard" },
    LeaderBoard: { first: "Users", second: "Settings" },
    Settings: { first: "LeaderBoard", second: "Logout" },
    Logout: { first: "Settings", second: null },
  };

  const getAdjClassNames = (itemName) => {
    const currentAdj = adjacencyMap[activeSection] || {};
    const first = currentAdj.first || "";
    const second = currentAdj.second || "";
    let extraClasses = "";
    if (itemName === first) extraClasses += " first-adjacent";
    if (itemName === second) extraClasses += " second-adjacent";
    return extraClasses;
  };

  useEffect(() => {
    fetchingUsers();
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("username");
    if (user) setUserName(user);
  }, []);

  useEffect(() => {
    if (activeSection === "Users" || activeSection === "Dashboard") fetchingUsers();
  }, [activeSection]);

  const HandleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchingUsers = async () => {
    try {
      const adminUsername = username;
      const response = await fetch(`http://localhost:8000/api/admin/fetchUsers/${adminUsername}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setUsers(data);
      
      // Calculate active users (users who have completed at least one module)
      const activeCount = data.filter(user => {
        const completedModules = JSON.parse(localStorage.getItem(`${user._id}_completed`) || "[]");
        return completedModules.length > 0;
      }).length;
      setActiveUsers(activeCount);

      // Generate recent activity (mock data for now)
      const activity = data.slice(0, 5).map(user => ({
        username: user.username,
        action: "Completed a module",
        time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString()
      }));
      setRecentActivity(activity);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const currentAdmin = localStorage.getItem("username");
      const response = await axios.get(`http://localhost:8000/api/leaderboard/fetchAdminLeaderboard/${currentAdmin}`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const showLeaderBoard = async () => {
    setActiveSection("LeaderBoard");
    fetchLeaderboard();
  };

  const toggleProfile = async (userId) => {
    if (selectedProfile && selectedProfile.userId === userId) {
      setSelectedProfile(null);
      return;
    }
    await fetchUserProfile(userId);
    if (userId) handleReportChange("softskills", userId);
  };

  const fetchUserProfile = async (selectedId) => {
    setLoading(true);
    setError("");
    try {
      const adminUsername = username;
      const response = await fetch(`http://localhost:8000/api/admin/profile/${adminUsername}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedId }),
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error("Server returned non-JSON data or no data");
      }
      if (!response.ok) throw new Error(data.error || "Failed to fetch profile");
      setSelectedProfile({ userId: selectedId, ...data });
    } catch (error) {
      setError(error.message);
      console.error(error);
    }
    setLoading(false);
  };

  const getImageSrc = (profileImage) => {
    if (!profileImage || !profileImage.data) return "";
    const base64String = btoa(
      new Uint8Array(profileImage.data.data ? profileImage.data.data : []).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
    );
    return `data:${profileImage.contentType};base64,${base64String}`;
  };

  const viewReport = (userId) => {
    localStorage.setItem("adminUserId", userId);
    navigate(`/reportlist/${userId}`);
  };

  const handleReportChange = async (reportName, userIdParam) => {
    const userId = userIdParam || (selectedProfile?.user?._id || selectedProfile?.userId);
    setSelectedReport(reportName);
    setLoading(true);
    try {
      const data = await progressService.getUserProgress(userId);
      if (reportName === "softskills") {
        setLearningProgress(data.learningProgress?.softskills || {});
        setTrainingProgress({
          reading: data.trainingProgress?.reading || {},
          listening: data.trainingProgress?.listening || {},
        });
      } else if (reportName === "sales") {
        setLearningProgress(data.learningProgress?.sales || {});
        setTrainingProgress({
          salesSpeaking: data.trainingProgress?.salesSpeaking || {},
        });
      } else if (reportName === "communication") {
        setLearningProgress(data.learningProgress?.product || {});
        setTrainingProgress(null);
      }
    } catch (error) {
      console.error("Error fetching user progress:", error);
    }
    setLoading(false);
  };

  const handleTrainingClick = (e) => {
    if (!Object.keys(progress).length) {
      e.preventDefault();
      return false;
    }
    return true;
  };

  const getCompletionStatus = (topic) => {
    if (progress[topic] && progress[topic].completed)
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    const completedTopicsFromStorage = JSON.parse(localStorage.getItem(`${"softskills"}_completed`) || "[]");
    if (completedTopicsFromStorage.includes(topic))
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    return null;
  };

  const getTrainingCompletionStatus = (type) => {
    if (!trainingProgress[type]) return null;
    let completedCount = 0;
    if (typeof trainingProgress[type] === "object" && !Array.isArray(trainingProgress[type])) {
      completedCount = Object.keys(trainingProgress[type]).length;
    } else if (Array.isArray(trainingProgress[type])) {
      const uniqueIds = new Set();
      trainingProgress[type].forEach(item => {
        const id = item.exerciseId || item.passageId || item.topicId;
        if (id) uniqueIds.add(id);
      });
      completedCount = uniqueIds.size;
    }
    let totalItems = 5;
    if (type === "speaking") totalItems = 10;
    const percentage = Math.min(Math.round((completedCount / totalItems) * 100), 100);
    if (percentage >= 50)
      return <span className="app-sidebar__completion-status app-sidebar__completed">✓</span>;
    return <span className="app-sidebar__completion-percentage">{percentage}%</span>;
  };

  return (
    <div className="adminpannel-container">
      <div className="adminpannel-sidebar">
        <div className="adminpannel-sidebar-menu">
          <div className={"adminpannel-sidebar-menu-item Sample" + getAdjClassNames("Sample")} />
          <div
            className={"adminpannel-sidebar-menu-item " + (activeSection === "Dashboard" ? "active " : "") + "Dashboard" + getAdjClassNames("Dashboard")}
            onClick={() => setActiveSection("Dashboard")}
          >
            <MdDashboardCustomize size={30} /> Dashboard
          </div>
          <div
            className={"adminpannel-sidebar-menu-item " + (activeSection === "Users" ? "active " : "") + "users" + getAdjClassNames("Users")}
            onClick={() => setActiveSection("Users")}
          >
            <FaRegUser size={30} /> Users
          </div>
          <div
            className={"adminpannel-sidebar-menu-item " + (activeSection === "LeaderBoard" ? "active " : "") + "LeaderBoard" + getAdjClassNames("LeaderBoard")}
            onClick={showLeaderBoard}
          >
            <MdLeaderboard size={30} /> LeaderBoard
          </div>
          <div
            className={"adminpannel-sidebar-menu-item " + (activeSection === "Settings" ? "active " : "") + "Settings" + getAdjClassNames("Settings")}
            onClick={() => setActiveSection("Settings")}
          >
            <IoMdSettings size={30} /> Settings
          </div>
          <div className={"adminpannel-sidebar-menu-item logout" + getAdjClassNames("Logout")} onClick={HandleLogout}>
            <IoMdLogOut size={30} /> Logout
          </div>
        </div>
      </div>
      <div className="adminpannel-content">
        <div className="adminpannel-content-header">
          <div className="adminpannel-content-info">
            <div className="adminpannel-admin-avatar">
              <FaRegUser size={24} />
            </div>
            <div className="adminpannel-admin-details">
              <div className="adminpannel-content-info-name">{username}</div>
              <div className="adminpannel-content-info-role">Administrator</div>
            </div>
          </div>
        </div>
        <div className="adminpannel-content-body">
          {activeSection === "Dashboard" && (
            <div className="adminpannel-section">
              <div className="adminpannel-section-box">
                <div className="adminpannel-welcome-container">
                  <div className="adminpannel-welcome-content">
                    <h2 className="adminpannel-section-heading">Welcome to Your Dashboard</h2>
                    <p className="adminpannel-welcome-text">Welcome back! Here's what's happening with your platform today.</p>
                  </div>
                  <div className="adminpannel-welcome-icon">
                    <MdDashboardCustomize size={40} />
                  </div>
                </div>
              </div>
              
              <div className="adminpannel-stats-container">
                <div className="adminpannel-stat-card">
                  <div className="adminpannel-stat-icon">
                    <FaRegUser size={24} />
                  </div>
                  <div className="adminpannel-stat-content">
                    <h3>Total Users</h3>
                    <p className="adminpannel-stat-number">{users.length}</p>
                  </div>
                </div>

                <div className="adminpannel-stat-card">
                  <div className="adminpannel-stat-icon">
                    <MdLeaderboard size={24} />
                  </div>
                  <div className="adminpannel-stat-content">
                    <h3>Platform Status</h3>
                    <p className="adminpannel-stat-number">Active</p>
                  </div>
                </div>

                <div className="adminpannel-stat-card">
                  <div className="adminpannel-stat-icon">
                    <MdDashboardCustomize size={24} />
                  </div>
                  <div className="adminpannel-stat-content">
                    <h3>System Health</h3>
                    <p className="adminpannel-stat-number">98%</p>
                  </div>
                </div>
              </div>

              <div className="adminpannel-recent-activity">
                <h3>System Overview</h3>
                <div className="adminpannel-activity-list">
                  <div className="adminpannel-activity-item">
                    <div className="adminpannel-activity-content">
                      <span className="adminpannel-activity-user">Server Status</span>
                      <span className="adminpannel-activity-action">Running Optimally</span>
                    </div>
                    <span className="adminpannel-activity-time">Last checked: 2 minutes ago</span>
                  </div>
                  <div className="adminpannel-activity-item">
                    <div className="adminpannel-activity-content">
                      <span className="adminpannel-activity-user">Database</span>
                      <span className="adminpannel-activity-action">Connected & Stable</span>
                    </div>
                    <span className="adminpannel-activity-time">Last checked: 2 minutes ago</span>
                  </div>
                  <div className="adminpannel-activity-item">
                    <div className="adminpannel-activity-content">
                      <span className="adminpannel-activity-user">API Services</span>
                      <span className="adminpannel-activity-action">All Systems Operational</span>
                    </div>
                    <span className="adminpannel-activity-time">Last checked: 2 minutes ago</span>
                  </div>
                  <div className="adminpannel-activity-item">
                    <div className="adminpannel-activity-content">
                      <span className="adminpannel-activity-user">Security Status</span>
                      <span className="adminpannel-activity-action">Protected & Secure</span>
                    </div>
                    <span className="adminpannel-activity-time">Last checked: 2 minutes ago</span>
                  </div>
                  <div className="adminpannel-activity-item">
                    <div className="adminpannel-activity-content">
                      <span className="adminpannel-activity-user">Backup Status</span>
                      <span className="adminpannel-activity-action">Last Backup: 2 hours ago</span>
                    </div>
                    <span className="adminpannel-activity-time">Last checked: 2 minutes ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeSection === "Users" && (
            <div className="adminpannel-section">
              <div className="adminpannel-section-box">
                <div className="adminpannel-users-header">
                  <div className="adminpannel-users-header-content">
                    <h2 className="adminpannel-section-heading">User Management</h2>
                    <p>Monitor and manage user activities, progress, and performance</p>
                  </div>
                  <div className="adminpannel-users-stats">
                    <div className="adminpannel-stat-card">
                      <div className="adminpannel-stat-icon">
                        <FaRegUser size={24} />
                      </div>
                      <div className="adminpannel-stat-content">
                        <h3>Total Users</h3>
                        <p className="adminpannel-stat-number">{users.length}</p>
                      </div>
                    </div>
                    <div className="adminpannel-stat-card">
                      <div className="adminpannel-stat-icon">
                        <MdLeaderboard size={24} />
                      </div>
                      <div className="adminpannel-stat-content">
                        <h3>Active Users</h3>
                        <p className="adminpannel-stat-number">{activeUsers}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="adminpannel-users-grid">
                {users.map((user) => (
                  <div key={user._id}>
                    <div className="adminpannel-user-card">
                      <div className="adminpannel-user-card-header">
                        <div className="adminpannel-user-avatar">
                          {getImageSrc(user.profileImage) ? (
                            <img 
                              src={getImageSrc(user.profileImage)} 
                              alt={user.username}
                              className="adminpannel-user-avatar-img"
                            />
                          ) : (
                            <div className="adminpannel-user-avatar-placeholder">
                              <FaRegUser size={24} />
                            </div>
                          )}
                        </div>
                        <div className="adminpannel-user-info">
                          <h3>{user.username}</h3>
                          <p>{user.email}</p>
                        </div>
                      </div>

                      <div className="adminpannel-user-actions">
                        <button 
                          className="adminpannel-action-btn view-profile"
                          onClick={() => toggleProfile(user._id)}
                        >
                          View Profile
                        </button>
                        <button 
                          className="adminpannel-action-btn view-report"
                          onClick={() => viewReport(user._id)}
                        >
                          View Report
                        </button>
                      </div>
                    </div>

                    {selectedProfile && selectedProfile.userId === user._id && (
                      <div className="adminpannel-user-profile-expanded">
                        {loading ? (
                          <div className="adminpannel-loading">
                            <div className="adminpannel-loading-spinner"></div>
                            <p>Loading Profile...</p>
                          </div>
                        ) : error ? (
                          <div className="adminpannel-error">
                            <div className="adminpannel-error-icon">⚠️</div>
                            <p>{error}</p>
                          </div>
                        ) : (
                          <div className="adminpannel-profile-content">
                            <div className="adminpannel-profile-header">
                              <div className="adminpannel-profile-image-wrapper">
                                {getImageSrc(selectedProfile.profileImage) ? (
                                  <img 
                                    src={getImageSrc(selectedProfile.profileImage)} 
                                    alt="Profile" 
                                    className="adminpannel-profile-image"
                                  />
                                ) : (
                                  <div className="adminpannel-profile-image-placeholder">
                                    <FaRegUser size={40} />
                                  </div>
                                )}
                              </div>
                              <div className="adminpannel-profile-details">
                                <div className="adminpannel-profile-name-section">
                                  <h4>{selectedProfile.user?.username || user.username}</h4>
                                  <span className="adminpannel-profile-email">{user.email}</span>
                                </div>
                                <div className="adminpannel-profile-info-grid">
                                  <div className="adminpannel-profile-info-item">
                                    <span className="adminpannel-profile-info-label">Phone</span>
                                    <span className="adminpannel-profile-info-value">{selectedProfile.phone || "N/A"}</span>
                                  </div>
                                  <div className="adminpannel-profile-info-item">
                                    <span className="adminpannel-profile-info-label">Last Activity</span>
                                    <span className="adminpannel-profile-info-value">
                                      {selectedProfile.lastActivity ? new Date(selectedProfile.lastActivity).toLocaleString() : "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="adminpannel-profile-tabs">
                              <button 
                                className={`adminpannel-tab-btn ${selectedReport === "softskills" ? "active" : ""}`}
                                onClick={() => handleReportChange("softskills")}
                              >
                                <span className="adminpannel-tab-icon">🎯</span>
                                Soft Skills
                              </button>
                              <button 
                                className={`adminpannel-tab-btn ${selectedReport === "sales" ? "active" : ""}`}
                                onClick={() => handleReportChange("sales")}
                              >
                                <span className="adminpannel-tab-icon">💰</span>
                                Sales
                              </button>
                              <button 
                                className={`adminpannel-tab-btn ${selectedReport === "communication" ? "active" : ""}`}
                                onClick={() => handleReportChange("communication")}
                              >
                                <span className="adminpannel-tab-icon">💬</span>
                                Communication
                              </button>
                            </div>

                            <div className="adminpannel-modules-section">
                              <div className="adminpannel-modules-header">
                                <h4>Completed Modules</h4>
                                <span className="adminpannel-modules-count">
                                  {Object.keys(learningProgress).length} modules
                                </span>
                              </div>
                              {Object.keys(learningProgress).length > 0 ? (
                                <div className="adminpannel-modules-grid">
                                  {Object.keys(learningProgress).map((moduleName, idx) => (
                                    <div key={idx} className="adminpannel-module-card">
                                      <div className="adminpannel-module-icon">📚</div>
                                      <div className="adminpannel-module-content">
                                        <span className="adminpannel-module-name">{moduleName}</span>
                                        <span className="adminpannel-module-status">
                                          <span className="adminpannel-module-status-dot"></span>
                                          Completed
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="adminpannel-no-data">
                                  <div className="adminpannel-no-data-icon">📝</div>
                                  <p>No modules completed yet</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSection === "LeaderBoard" && (
            <div className="adminpannel-section adminpannel-leaderboard-section">
              <div className="adminpannel-section-box">
                <div className="adminpannel-leaderboard-header">
                  <div className="adminpannel-leaderboard-header-content">
                    <h2 className="adminpannel-section-heading">User Leaderboard</h2>
                    <p>Track and celebrate top performers on your platform</p>
                  </div>
                  <div className="adminpannel-leaderboard-stats">
                    <div className="adminpannel-stat-card">
                      <div className="adminpannel-stat-icon">
                        <MdLeaderboard size={24} />
                      </div>
                      <div className="adminpannel-stat-content">
                        <h3>Total Participants</h3>
                        <p className="adminpannel-stat-number">{leaderboard.length}</p>
                      </div>
                    </div>
                    <div className="adminpannel-stat-card">
                      <div className="adminpannel-stat-icon">
                        <FaRegUser size={24} />
                      </div>
                      <div className="adminpannel-stat-content">
                        <h3>Active Competition</h3>
                        <p className="adminpannel-stat-number">Weekly</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="adminpannel-leaderboard-content">
                {leaderboard.length > 0 ? (
                  <div className="adminpannel-leaderboard-grid">
                    {leaderboard.map((user, index) => (
                      <div 
                        key={user.userId} 
                        className={`adminpannel-leaderboard-card ${index < 3 ? `top-${index + 1}` : ''}`}
                      >
                        <div className="adminpannel-leaderboard-rank">
                          {index < 3 ? (
                            <div className="adminpannel-leaderboard-medal">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </div>
                          ) : (
                            <span className="adminpannel-leaderboard-rank-number">#{index + 1}</span>
                          )}
                        </div>
                        <div className="adminpannel-leaderboard-user-info">
                          <div className="adminpannel-leaderboard-avatar">
                            <FaRegUser size={24} />
                          </div>
                          <div className="adminpannel-leaderboard-details">
                            <h3>{user.username}</h3>
                            <div className="adminpannel-leaderboard-score">
                              <span className="adminpannel-leaderboard-score-label">Score:</span>
                              <span className="adminpannel-leaderboard-score-value">{user.overallScore.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="adminpannel-leaderboard-progress">
                          <div className="adminpannel-leaderboard-progress-bar">
                            <div 
                              className="adminpannel-leaderboard-progress-fill"
                              style={{ 
                                width: `${(user.overallScore / leaderboard[0].overallScore) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="adminpannel-leaderboard-empty">
                    <div className="adminpannel-leaderboard-empty-icon">
                      <MdLeaderboard size={48} />
                    </div>
                    <h3>No Leaderboard Data Available</h3>
                    <p>There are currently no users with scores to display.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeSection === "Settings" && (
            <div className="adminpannel-section">
              <div className="adminpannel-section-box">
                <h2 className="adminpannel-section-heading">Site Settings</h2>
                <p>
                  Manage your personal admin settings here. In the future, you will be able to update your profile, change your password, configure notifications, and adjust other site preferences.
                </p>
              </div>
              <div className="adminpannel-settings-static">
                <h3>Account Settings</h3>
                <p>[Static Account Settings Placeholder]</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPannel;
