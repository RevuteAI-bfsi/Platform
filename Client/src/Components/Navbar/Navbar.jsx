import React from 'react';
import { FaBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import companyLogo from '../../images/company_logo.jpeg';
import './Navbar.css';
import { FaUser } from "react-icons/fa";
import { logout } from '../../Services/apiConnection';

const Navbar = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const handleProfile = () => {
    navigate(`/profile/${userId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear localStorage and navigate even if API call fails
      localStorage.clear();
      navigate('/creditianls');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar__logo" onClick={() => navigate('/')}>
        <img src={companyLogo} alt="Company Logo" />
      </div>

      <div className="navbar__menu">
        {/* <div className="navbar__notification" onClick={handleProfile}>
          <FaBell />
        </div> */}
        <button className="navbar__btn" onClick={handleLogout}>
          Logout
        </button>
        <div className='profileContainer' onClick={handleProfile}>
        <FaUser size={20}/>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;