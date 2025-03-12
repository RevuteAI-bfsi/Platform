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

const AdminPannel = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [users, setUsers] = useState([]);
  const [username, setUserName] = useState("Admin");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [graphData, setGraphData] = useState([]);
  

  // On mount, fetch users (for graph data and more)
  useEffect(() => {
    fetchingUsers();
  }, []);

  // Update username from localStorage on mount
  useEffect(() => {
    const user = localStorage.getItem("username");
    if (user) {
      setUserName(user);
    }
  }, []);

  // When active section changes to Dashboard or Users, refresh user data
  useEffect(() => {
    if (activeSection === "Users" || activeSection === "Dashboard") {
      fetchingUsers();
    }
  }, [activeSection]);

  const HandleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchingUsers = async () => {
    try {
      const adminUsername = username;
      const response = await fetch(
        `http://localhost:8000/api/admin/fetchUsers/${adminUsername}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
      // Update graph data with current total users count along with the date
      const newPoint = {
        date: new Date().toLocaleDateString(),
        totalUsers: data.length,
      };
      console.log(data.length);
      setGraphData((prev) => [...prev, newPoint]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const showLeaderBoard = async () => {
    setActiveSection("LeaderBoard");
    try {
      const response = await axios.get(
        "http://localhost:8000/api/admin/fetchUser/leaderboard"
      );
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    }
  };

  const toggleProfile = async (userId) => {
    if (selectedProfile && selectedProfile.userId === userId) {
      setSelectedProfile(null);
      return;
    }
    await fetchUserProfile(userId);
  };

  const fetchUserProfile = async (selectedId) => {
    setLoading(true);
    setError("");
    try {
      const adminUsername = username;
      const response = await fetch(
        `http://localhost:8000/api/admin/profile/${adminUsername}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedId }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setSelectedProfile({ userId: selectedId, ...data });
    } catch (error) {
      setError("Error fetching profile.");
      console.error(error);
    }
    setLoading(false);
  };

  const getImageSrc = (profileImage) => {
    if (!profileImage || !profileImage.data) return "";
    const base64String = btoa(
      new Uint8Array(profileImage.data.data).reduce(
        (acc, byte) => acc + String.fromCharCode(byte),
        ""
      )
    );
    return `data:${profileImage.contentType};base64,${base64String}`;
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

  return (
    <div className="adminpannel-container">
      <div className="adminpannel-sidebar">
        <div className="adminpannel-sidebar-menu">
          <div
            className={`adminpannel-sidebar-menu-item ${
              activeSection === "Dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveSection("Dashboard")}
          >
            <MdDashboardCustomize size={30}/> Dashboard
          </div>
          <div
            className={`adminpannel-sidebar-menu-item ${
              activeSection === "Users" ? "active" : ""
            }`}
            onClick={() => setActiveSection("Users")}
          >
           <FaRegUser size={30}/> Users
          </div>
          <div
            className={`adminpannel-sidebar-menu-item ${
              activeSection === "LeaderBoard" ? "active" : ""
            }`}
            onClick={showLeaderBoard}
          >
           <MdLeaderboard size={30}/> LeaderBoard
          </div>
          <div
            className={`adminpannel-sidebar-menu-item ${
              activeSection === "Settings" ? "active" : ""
            }`}
            onClick={() => setActiveSection("Settings")}
          >
           <IoMdSettings size={30}/> Settings
          </div>
          <div
            className="adminpannel-sidebar-menu-item"
            onClick={HandleLogout}
          >
           <IoMdLogOut size={30}/> Logout
          </div>
        </div>
      </div>

      <div className="adminpannel-content">
        <div className="adminpannel-content-header">
          <div className="adminpannel-content-info">
            <div className="adminpannel-content-info-name">
              Hi, {username}
            </div>
            <div className="adminpannel-content-info-quote">
              Ready to Start your day with some Pitch deck?
            </div>
          </div>
        </div>

        <div className="adminpannel-content-body">
          {activeSection === "Dashboard" && (
            <div className="adminpannel-section">
              <div className="adminpannel-section-box">
                <h2 className="adminpannel-section-heading">
                  Welcome to Your Dashboard
                </h2>
                <p>
                  Hi, Admin! Welcome to your dashboard. Here you can get a quick
                  overview of your website’s performance and activity. For now,
                  this section shows static data, but soon you’ll be able to see
                  live statistics, recent user activity, and key performance
                  indicators to help you manage your site effectively.
                </p>
              </div>
              <div className="adminpannel-dashboard-static">
                <h3>Overview Metrics</h3>
                {/* Removed Total Users */}
                <p>Active Users: 80</p>
                <p>New Registrations: 20</p>
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
                <p>
                  This section displays the list of registered users on your
                  platform. Click on "View Profile" to see detailed user
                  information such as contact details and recent activity. In this
                  static version, the user list is pre-populated, but future updates
                  will integrate dynamic data and options for account management,
                  editing, or suspending users.
                </p>
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
                              <button onClick={() => toggleProfile(user._id)}>
                                View Profile
                              </button>
                            </td>
                            <td>
                              <button>View Report</button>
                            </td>
                          </tr>
                          {selectedProfile &&
                            selectedProfile.userId === user._id && (
                              <tr>
                                <td
                                  colSpan="5"
                                  className="adminpannel-profile-details-cell"
                                >
                                  {loading ? (
                                    <p>Loading Profile..</p>
                                  ) : error ? (
                                    <p>{error}</p>
                                  ) : (
                                    <div className="adminpannel-profile-details">
                                      <div className="adminpannel-profile-image-container">
                                        <img
                                          className="adminpannel-profile-image"
                                          src={getImageSrc(
                                            selectedProfile.profileImage
                                          )}
                                          alt="Profile"
                                        />
                                      </div>
                                      <p>
                                        <strong>Username:</strong>{" "}
                                        {selectedProfile.user?.username ||
                                          user.username}
                                      </p>
                                      <p>
                                        <strong>Phone:</strong>{" "}
                                        {selectedProfile.phoneNumber || "N/A"}
                                      </p>
                                      <p>
                                        <strong>Last Activity:</strong>{" "}
                                        {selectedProfile.lastActivity
                                          ? new Date(
                                              selectedProfile.lastActivity
                                            ).toLocaleString()
                                          : "N/A"}
                                      </p>
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
                  Check out the leaderboard to view top performers on your
                  platform. Currently, the leaderboard data is static and serves as
                  a placeholder. In future releases, this section will update in real
                  time, showing rankings based on topics completed and overall scores.
                </p>
              </div>
              <div className="adminpannel-table-responsive">
                <table className="adminpannel-leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Topics Completed</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.userId}>
                          <td>{user.rank}</td>
                          <td>{user.username}</td>
                          <td>{user.topicsCompleted}</td>
                          <td>{user.overallScore}</td>
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
