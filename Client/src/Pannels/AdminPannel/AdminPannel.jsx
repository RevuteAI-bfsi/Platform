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
  const [graphData, setGraphData] = useState([]);
  const [selectedReport, setSelectedReport] = useState("softskills");
  const [learningProgress, setLearningProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState(null);
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
      const newPoint = {
        date: new Date().toLocaleDateString(),
        totalUsers: data.length,
      };
      setGraphData((prev) => [...prev, newPoint]);
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

  const chartData = {
    labels: graphData.map((point) => point.date),
    datasets: [
      {
        label: "Total Users",
        data: graphData.map((point) => point.totalUsers),
        fill: false,
        borderColor: "#1E2330",
        tension: 0.1,
      },
    ],
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
            <div className="adminpannel-content-info-name">Hi, {username}</div>
            <div className="adminpannel-content-info-date">{new Date().toLocaleDateString()}</div>
          </div>
        </div>
        <div className="adminpannel-content-body">
          {activeSection === "Dashboard" && (
            <div className="adminpannel-section">
              <div className="adminpannel-section-box">
                <h2 className="adminpannel-section-heading">Welcome to Your Dashboard</h2>
                <p>Hi, Admin! Welcome to your dashboard. Here you can get a quick overview of your website’s performance and activity.</p>
              </div>
              <div className="adminpannel-dashboard-static">
                <h3>Visual Data</h3>
                <Line data={chartData} />
              </div>
            </div>
          )}
          {activeSection === "Users" && (
            <div className="adminpannel-section">
              <div className="adminpannel-section-box">
                <h2 className="adminpannel-section-heading">Manage Users</h2>
                <p>This section lists registered users. Click "View Profile" for details like contact information, activity, and module completions.</p>
              </div>
              {users.length > 0 ? (
                <div className="adminpannel-table-responsive">
                  <table className="adminpannel-user-table">
                    <thead>
                      <tr>
                        <th>Sr.no</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Profile</th>
                        <th>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <React.Fragment key={user._id}>
                          <tr>
                            <td>{index + 1}</td>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>
                              <button className="adminreportbtn" onClick={() => toggleProfile(user._id)}>View Profile</button>
                            </td>
                            <td>
                              <button className="adminreportbtn" onClick={() => viewReport(user._id)}>View Report</button>
                            </td>
                          </tr>
                          {selectedProfile && selectedProfile.userId === user._id && (
                            <tr>
                              <td colSpan="5" className="adminpannel-profile-details-cell">
                                {loading ? (
                                  <p>Loading Profile...</p>
                                ) : error ? (
                                  <p style={{ color: "red" }}>{error}</p>
                                ) : (
                                  <div className="adminpannel-profile-details">
                                    <div className="adminpannel-profile-image-container">
                                      <img className="adminpannel-profile-image" src={getImageSrc(selectedProfile.profileImage)} alt="Profile" />
                                    </div>
                                    <p><strong>Username:</strong> {selectedProfile.user?.username || user.username}</p>
                                    <p><strong>Phone:</strong> {selectedProfile.phone || "N/A"}</p>
                                    <p><strong>Last Activity:</strong> {selectedProfile.lastActivity ? new Date(selectedProfile.lastActivity).toLocaleString() : "N/A"}</p>
                                    <div className="module-report-tabs">
                                      <button className={`${selectedReport === "softskills" ? "active" : ""} adminpage-btn-design`} onClick={() => handleReportChange("softskills")}>Soft Skills</button>
                                      <button className={`${selectedReport === "sales" ? "active" : ""} adminpage-btn-design`} onClick={() => handleReportChange("sales")}>Sales</button>
                                      <button className={`${selectedReport === "communication" ? "active" : ""} adminpage-btn-design`} onClick={() => handleReportChange("communication")}>Communication</button>
                                    </div>
                                    <div className="module-report-details">
                                      {loading ? (
                                        <p>Loading report...</p>
                                      ) : (
                                        <>
                                          <h4>{selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Modules Completed</h4>
                                          {Object.keys(learningProgress).length > 0 ? (
                                            <ul>
                                              {Object.keys(learningProgress).map((moduleName, idx) => (
                                                <li key={idx}><strong>{moduleName}</strong></li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p>No modules completed yet.</p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No users found.</p>
              )}
            </div>
          )}
          {activeSection === "LeaderBoard" && (
            <div className="adminpannel-section adminpannel-leaderboard-section">
              <div className="adminpannel-section-box">
                <h2 className="adminpannel-section-heading">User Leaderboard</h2>
                <p>
                  Check out the leaderboard to view top performers on your platform. Rankings are based on overall scores.
                </p>
              </div>
              <div className="adminpannel-table-responsive">
                <table className="adminpannel-leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      {/* <th>Topics Completed</th> */}
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      leaderboard.map((user, index) => (
                        <tr key={user.userId}>
                          <td>{index + 1}</td>
                          <td>{user.username}</td>
                          {/* <td>{user.topicsCompleted || "-"}</td> */}
                          <td>{user.overallScore.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No leaderboard data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
