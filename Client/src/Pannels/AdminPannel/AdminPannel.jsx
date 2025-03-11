import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminPannel.css";
import { useNavigate } from "react-router-dom";

const AdminPannel = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [users, setUsers] = useState([]);
  const [username, setUserName] = useState("Admin");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeSection === "Users") {
      fetchingUsers();
    }
  }, [activeSection]);

  useEffect(() => {
    const user = localStorage.getItem("username");
    if (user) {
      setUserName(user);
    }
  }, [username]);

  const HandleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchingUsers = async () => {
    setActiveSection("Users");
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

  return (
    <div className="adminContainer">
      <div className="adminSidebar">
        <div className="adminSidebar-menu">
          <div
            className="adminSidebar-menu-item"
            onClick={() => setActiveSection("Dashboard")}
          >
            Dashboard
          </div>
          <div className="adminSidebar-menu-item" onClick={fetchingUsers}>
            Users
          </div>
          <div className="adminSidebar-menu-item" onClick={showLeaderBoard}>
            LeaderBoard
          </div>
          <div
            className="adminSidebar-menu-item"
            onClick={() => setActiveSection("Settings")}
          >
            Settings
          </div>
          <div className="adminSidebar-menu-item" onClick={HandleLogout}>
            Logout
          </div>
        </div>
      </div>

      <div className="adminContent">
        <div className="adminContent-header">
          <div className="adminContent-info">
            <div className="adminContent-info-name">Hi, {username}</div>
            <div className="adminContent-info-quote">
              Ready to Start your day with some Pitch deck?
            </div>
          </div>
        </div>

        <div className="adminContent-body">
          {activeSection === "Dashboard" && (
            <div className="adminSection">
              <h2 className="adminSection-heading">Dashboard</h2>
              <div>This is dashboard area</div>
            </div>
          )}

          {activeSection === "Users" && (
            <div className="adminSection">
              <h2 className="adminSection-heading">Users</h2>
              <p>List of all existing users:</p>
              {users.length > 0 ? (
                <div className="table-responsive">
                  <table className="userTable">
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
                                <td colSpan="5" className="profileDetailsCell">
                                  {loading ? (
                                    <p>Loading Profile..</p>
                                  ) : error ? (
                                    <p>{error}</p>
                                  ) : (
                                    <div className="profileDetails">
                                      <div className="profileImageContainer">
                                        <img
                                          className="profileImage"
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
            <div className="adminSection leaderboardSection">
              <h2 className="adminSection-heading">LeaderBoard</h2>
              <div className="table-responsive">
                <table className="leaderboardTable">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Topics Completed</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.userId}>
                        <td>{user.rank}</td>
                        <td>{user.username}</td>
                        <td>{user.topicsCompleted}</td>
                        <td>{user.overallScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "Settings" && (
            <div className="adminSection">
              <h2>Settings</h2>
              <div>This is settings area</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPannel;
