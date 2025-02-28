import React, { useState } from "react";
import "./Elearning.css";
import companyLogo from "../../images/company_logo.jpeg";
import { useNavigate } from "react-router-dom";
import enrollImg from "../../images/enroll.jpg";
import { FaUser } from "react-icons/fa";

const Elearning = () => {
  const navigate = useNavigate();
  const [previewCourse, setPreviewCourse] = useState(null);

  const coursesData = [
    {
      title: "Soft Skills",
      subitems: [
        {
          title: "Grammar",
          subtopics: [
            "Parts of Speech",
            "Tenses",
            "Sentence Structure & Punctuation",
            "Professional vocabulary",
          ],
        },
        {
          title: "Communication",
          subtopics: [
            "Definition and scope of communication",
            "Reading",
            "Writing",
            "Listening",
            "Speaking",
            "Attire",
            "Persuasion Technique",
            "Phone etiquette",
          ],
        },
      ],
    },
    {
      title: "Sales Personal Skills",
      subitems: [
        {
          title: "Introduction to Sales",
          subtopics: ["Sales Vs. Marketing", "Role of a sales-person"],
        },
        {
          title: "Handling Objections",
          subtopics: [
            "Building Rapport and Trust",
            "Customer Pain points and trust indicators",
            "Conflict Resolution",
            "Case studies (By Domain Expert)",
          ],
        },
        {
          title: "Negotiation Skills",
          subtopics: [
            "Emotional Intelligence",
            "Decision making",
            "Value creation",
          ],
        },
        {
          title: "Tools and Framework",
          subtopics: [
            "CRM tool",
            "Lead generation & prospecting techniques",
            "Customer profiling & segmentation",
            "Pipeline management",
            {
              title: "Types of frameworks",
              subtopics: ["AIDA", "SPIN", "BANT"],
            },
          ],
        },
        {
          title: "Problem-Solving & Resilience",
          subitems: [
            "Syllogisms",
            "Statement and assumptions",
            "Statement and conclusions",
            "Cause and Effect",
            "Case studies",
          ],
        },
        {
          title: "Time management",
          subitems: [
            'How to: “Set clear goals, Prioritise tasks, plan your day, Eliminate time wasters, Use time management tools.”',
          ],
        },
        {
          title: "Advanced Sales techniques",
          subtopics: [
            "B2B and B2C sales",
            "Post-sale relationship",
            "Strategies for win-win solutions",
          ],
        },
      ],
    },
    {
      title: "Product Knowledge",
      subitems: [
        {
          title: "Foundation to BFSI",
          subtopics: [
            "Bank",
            "Financial Institution",
            "Insurance",
            "Fintech",
            "Regulatory bodies of BFSI",
          ],
        },
        {
          title: "Key instruments of BFSI",
          subtopics: [
            "KYC/ e-KYC form",
            "Account opening form",
            "Securities and Loan processing document",
            "Key terminologies",
            "Interest rates",
          ],
        },
        {
          title: "Products and services of BFSI",
          subtopics: [
            "SB, CB account",
            "Credit card",
            "Fixed Deposit",
            "Recurring Deposit",
            "Personal Loan",
            "Home loan",
            "Gold loan",
            "Auto loan",
            "Crop/ Agriculture loan",
            "Top-up loan",
          ],
        },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const HandleJoinCoursebtn = () => {
    const userId = localStorage.getItem("userId");
    navigate(`/modules/${userId}`);
  };

  const handlePreview = (course) => {
    setPreviewCourse(course);
  };

  const closeModal = () => {
    setPreviewCourse(null);
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

          <div className="courses-container">
            {coursesData.map((course) => (
              <div
                key={course.title}
                className="course-card"
              >
                <h3 className="course-card-title">{course.title}</h3>
                <button
                  className="clickmeBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(course);
                  }}
                >
                  Preview
                </button>

                <button
                  className="clickmeBtn"
                  onClick={HandleJoinCoursebtn}
                >
                  click Me
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {previewCourse && (
        <div className="modal-overlay">
          <div className="modal-container">
            <button className="modal-close-btn" onClick={closeModal}>
              ×
            </button>
            <h2>{previewCourse.title}</h2>
            {previewCourse.subitems.map((subitem, idx) => (
              <div key={idx} className="modal-subitem">
                <h4>{subitem.title}</h4>
                <ul>
                  {(subitem.subtopics || subitem.subitems).map((topic, i) =>
                    typeof topic === "string" ? (
                      <li key={i}>{topic}</li>
                    ) : (
                      <li key={i}>
                        <strong>{topic.title}</strong>
                        <ul>
                          {topic.subtopics.map((t, j) => (
                            <li key={j}>{t}</li>
                          ))}
                        </ul>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Elearning;
