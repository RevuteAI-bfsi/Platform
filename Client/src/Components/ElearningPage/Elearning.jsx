import React from "react";
import { useNavigate } from "react-router-dom";
import "./Elearning.css";
import companyLogo from "../../images/company_logo.jpeg";
import enrollImg from "../../images/enroll.jpg";
import { FaUser } from "react-icons/fa";

const Elearning = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleSkillSelection = (skillType) => {
    switch (skillType) {
      case 'softskills':
        navigate('/softskills/learning/parts-of-speech');
        break;
      case 'sales':
        navigate('/sales/learning/introduction');
        break;
      case 'product':
        navigate('/product/learning/bank-terminologies');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="learningpage-mainContainer">
      <nav className="learningPage-Navbar">
        <div className="CompanyLogo-Here" onClick={() => navigate("/")}>
          <img src={companyLogo} alt="Company Logo" />
        </div>
        <div className="learningPageNavbar-rightsection">
          <button className="Logout-btn-design" onClick={handleLogout}>
            Logout
          </button>
          <div
            className="learningPageNavbar-circulardiv"
            onClick={() => navigate("/profile")}
          >
            <FaUser size={20} />
          </div>
        </div>
      </nav>

      <div className="learningpage-contentArea">
        <div className="learningPage-contentSection">
          <div
            className="learningPage-content-uppersection"
            style={{ display: "flex", alignItems: "center" }}
          >
            <div className="upper-image" style={{ marginRight: "20px" }}>
              <img
                src={enrollImg}
                alt="enroll image here"
                style={{
                  width: "200px",
                  height: "auto",
                  objectFit: "cover",
                }}
              />
            </div>
            <div className="banner-info">
              <h1 className="banner-title">RevuteAI e-Learning</h1>
              <p>
                Explore our well-structured courses that help you acquire good
                communication skills and strong marketing skills.
              </p>
              <div className="banner-stars">
                <span>⭐</span>
                <span>⭐</span>
                <span>⭐</span>
                <span>⭐</span>
                <span>⭐</span>
              </div>
            </div>
          </div>

          <div className="dashboard-container">
            <h1 className="dashboard-title">Skills Training Platform</h1>
            <p className="dashboard-description">
              Select a skill category to begin your training journey
            </p>

            <div className="skill-cards">
              <div className="skill-card" onClick={() => handleSkillSelection('softskills')}>
                <div className="skill-icon">💬</div>
                <h2>Soft Skills</h2>
                <p>Improve your communication and language skills</p>
                <button className="skill-button">Start Learning</button>
              </div>

              <div className="skill-card" onClick={() => handleSkillSelection('sales')}>
                <div className="skill-icon">📞</div>
                <h2>Sales Personal Skills</h2>
                <p>Develop your sales and tele-calling abilities</p>
                <button className="skill-button">Start Learning</button>
              </div>

              <div className="skill-card" onClick={() => handleSkillSelection('product')}>
                <div className="skill-icon">💼</div>
                <h2>Product Skills</h2>
                <p>Learn banking products and services</p>
                <button className="skill-button">Start Learning</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Elearning;
