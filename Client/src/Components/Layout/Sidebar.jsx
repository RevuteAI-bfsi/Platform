import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import progressService from "../../services/progressService";
import { determineSkillType } from "../../utils/skillTypeUtils";
import "./Sidebar.css";
import axios from "axios";

const Sidebar = ({ isOpen, skillType: propSkillType }) => {
  const location = useLocation();
  const [progress, setProgress] = useState({});
  const [trainingProgress, setTrainingProgress] = useState({});
  const [overallReadingAverage, setOverallReadingAverage] = useState(0);
  const [overallListeningAverage, setOverallListeningAverage] = useState(0);
  const [overallSpeakingAverage, setOverallSpeakingAverage] = useState(0);
  const [overallSalesSpeakingAverage, setOverallSalesSpeakingAverage] = useState(0);
  const [overallMCQAverage, setOverallMCQAverage] = useState(0);
  const [isLearningCompleted, setIsLearningCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const determineSkillTypeCallback = useCallback(() => {
    if (propSkillType) {
      return propSkillType;
    }
    return determineSkillType(location.pathname);
  }, [propSkillType, location.pathname]);

  const skillType = determineSkillTypeCallback();

  const getLearningTopics = useCallback(() => {
    if (skillType === "sales") {
      return [
        "introduction",
        "telecalling",
        "skills-needed",
        "telecalling-module",
      ];
    } else if (skillType === "product") {
      return ["bank-terminologies", "casa-kyc", "personal-loans"];
    } else {
      return [
        "parts-of-speech",
        "tenses",
        "sentence-correction",
        "communication",
      ];
    }
  }, [skillType]);

  const updateLeaderboard = async (data) => {
    try {
      const response = await axios.post(
        "http://localhost:8000/api/leaderboard/updateLeaderboard",
        data
      );
      console.log("Leaderboard updated:", response.data);
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  };

  const loadUserProgress = useCallback(async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User not logged in");
        return;
      }
      const learningTopics = getLearningTopics();
      const completedTopicsFromStorage = JSON.parse(
        localStorage.getItem(`${skillType}_completed`) || "[]"
      );
      const allCompletedInStorage = learningTopics.every((topic) =>
        completedTopicsFromStorage.includes(topic)
      );

      if (allCompletedInStorage) {
        setIsLearningCompleted(true);
        progressService
          .getUserProgress(userId)
          .then((data) => {
            setProgress(data.learningProgress[skillType] || {});
            setTrainingProgress(data.trainingProgress || {});
            setOverallReadingAverage(data.overallReadingAverage || 0);
            setOverallListeningAverage(data.overallListeningAverage || 0);
            setOverallSpeakingAverage(data.overallSpeakingAverage || 0);
            setOverallSalesSpeakingAverage(data.overallSalesSpeakingAverage || 0);
            setOverallMCQAverage(data.overallMCQAverage || 0);
            setLastRefresh(Date.now());
            const username = localStorage.getItem("username");
            const adminName = localStorage.getItem("adminName");
            updateLeaderboard({
              userId,
              username,
              adminName,
              overallReadingAverage: data.overallReadingAverage || 0,
              overallListeningAverage: data.overallListeningAverage || 0,
              overallSpeakingAverage: data.overallSpeakingAverage || 0,
              overallSalesSpeakingPractice: data.overallSalesSpeakingAverage || 0,
              overallProductMcq: data.overallMCQAverage || 0,
            });            
          })
          .catch((err) => {
            console.error("Background progress load error:", err);
          });
        return;
      }

      const {
        learningProgress,
        trainingProgress,
        overallReadingAverage,
        overallListeningAverage,
        overallSpeakingAverage,
        overallSalesSpeakingAverage,
        overallMCQAverage,
      } = await progressService.getUserProgress(userId);

      const moduleProgress = learningProgress[skillType] || {};
      setProgress(moduleProgress);
      const topicsStatus = getLearningTopics().map((topic) => ({
        topic,
        existsInDb: !!moduleProgress[topic],
        completedInDb: moduleProgress[topic] && moduleProgress[topic].completed,
        completedInStorage: completedTopicsFromStorage.includes(topic),
      }));
      const allCompleted = getLearningTopics().every(
        (topic) =>
          (moduleProgress[topic] && moduleProgress[topic].completed) ||
          completedTopicsFromStorage.includes(topic)
      );
      if (!allCompletedInStorage) {
        const completedInDb = getLearningTopics().filter(
          (topic) => moduleProgress[topic] && moduleProgress[topic].completed
        );
        if (completedInDb.length > 0) {
          const allCompletedTopics = [
            ...new Set([...completedTopicsFromStorage, ...completedInDb]),
          ];
          localStorage.setItem(
            `${skillType}_completed`,
            JSON.stringify(allCompletedTopics)
          );
        }
      }
      setIsLearningCompleted(allCompleted);
      setTrainingProgress(trainingProgress || {});
      setOverallReadingAverage(overallReadingAverage || 0);
      setOverallListeningAverage(overallListeningAverage || 0);
      setOverallSpeakingAverage(overallSpeakingAverage || 0);
      setOverallSalesSpeakingAverage(overallSalesSpeakingAverage || 0);
      setOverallMCQAverage(overallMCQAverage || 0);
      setLastRefresh(Date.now());
      const username = localStorage.getItem("username");
      const adminName = localStorage.getItem("adminName");
      updateLeaderboard({
        userId,
        username,
        adminName,
        overallReadingAverage: overallReadingAverage || 0,
        overallListeningAverage: overallListeningAverage || 0,
        overallSpeakingAverage: overallSpeakingAverage || 0,
        overallSalesSpeakingAverage: overallSalesSpeakingAverage || 0,
        overallMCQAverage: overallMCQAverage || 0,
      });
    } catch (error) {
      console.error("Error loading progress:", error);
      setError("Failed to load progress. Please try again.");
    }
  }, [skillType, getLearningTopics]);

  useEffect(() => {
    loadUserProgress();
  }, [location.pathname, skillType, loadUserProgress]);

  useEffect(() => {
    const handleProgressUpdate = (event) => {
      if (
        event.detail &&
        event.detail.progress &&
        event.detail.skillType === skillType
      ) {
        setProgress(event.detail.progress);
        const allCompleted = getLearningTopics().every(
          (topic) =>
            event.detail.progress[topic] &&
            event.detail.progress[topic].completed
        );
        setIsLearningCompleted(allCompleted);
      } else {
        loadUserProgress();
      }
    };
    window.addEventListener("progressUpdated", handleProgressUpdate);
    return () =>
      window.removeEventListener("progressUpdated", handleProgressUpdate);
  }, [loadUserProgress, skillType, getLearningTopics]);

  const getCompletionStatus = (topic) => {
    if (progress[topic] && progress[topic].completed) {
      return (
        <span className="app-sidebar__completion-status app-sidebar__completed">
          ✓
        </span>
      );
    }
    const completedTopicsFromStorage = JSON.parse(
      localStorage.getItem(`${skillType}_completed`) || "[]"
    );
    if (completedTopicsFromStorage.includes(topic)) {
      return (
        <span className="app-sidebar__completion-status app-sidebar__completed">
          ✓
        </span>
      );
    }
    return null;
  };

  const getTrainingCompletionStatus = (type) => {
    if (!trainingProgress[type]) return null;
    let completedCount = 0;
    if (
      typeof trainingProgress[type] === "object" &&
      !Array.isArray(trainingProgress[type])
    ) {
      completedCount = Object.keys(trainingProgress[type]).length;
    } else if (Array.isArray(trainingProgress[type])) {
      const uniqueIds = new Set();
      trainingProgress[type].forEach((item) => {
        const id = item.exerciseId || item.passageId || item.topicId;
        if (id) uniqueIds.add(id);
      });
      completedCount = uniqueIds.size;
    }
    let totalItems = 5;
    if (skillType === "sales" && type === "speaking") totalItems = 10;
    else if (skillType === "product" && type === "mcq") totalItems = 10;
    const percentage = Math.min(
      Math.round((completedCount / totalItems) * 100),
      100
    );
    if (percentage >= 50) {
      return (
        <span className="app-sidebar__completion-status app-sidebar__completed">
          ✓
        </span>
      );
    }
    return (
      <span className="app-sidebar__completion-percentage">{percentage}%</span>
    );
  };

  const handleTrainingClick = (e) => {
    if (!isLearningCompleted) {
      e.preventDefault();
      const learningTopics = getLearningTopics();
      const completedTopicsFromStorage = JSON.parse(
        localStorage.getItem(`${skillType}_completed`) || "[]"
      );
      const missingTopics = learningTopics.filter(
        (topic) =>
          !completedTopicsFromStorage.includes(topic) &&
          !(progress[topic] && progress[topic].completed)
      );
      if (missingTopics.length > 0) {
        console.log(`Missing topics: ${missingTopics.join(", ")}`);
      }
      return false;
    }
    return true;
  };

  const renderSoftSkillsSidebar = () => (
    <>
      <div className="app-sidebar__header">
        <h2>Soft Skills</h2>
        <div className="sidebar-debug">
          <small>
            Last Visit: {new Date(lastRefresh).toLocaleTimeString()}
          </small>
          <br />
          <small className="completion-status">
            Learning completed: {isLearningCompleted ? "✓" : "✗"}
          </small>
        </div>
      </div>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Learning</h3>
          <ul className="app-sidebar__nav-links">
            <li>
              <NavLink
                to="/softskills/learning/parts-of-speech"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Parts of Speech {getCompletionStatus("parts-of-speech")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/learning/tenses"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Tenses {getCompletionStatus("tenses")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/learning/sentence-correction"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Sentence Correction {getCompletionStatus("sentence-correction")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/learning/communication"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Communication {getCompletionStatus("communication")}
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Training</h3>
          {!isLearningCompleted && (
            <div className="app-sidebar__locked-message">
              <span className="app-sidebar__lock-icon">🔒</span>
              <span>Complete all learning modules first</span>
            </div>
          )}
          <ul className={`app-sidebar__nav-links ${!isLearningCompleted ? "app-sidebar__locked" : ""}`}>
            <li>
              <NavLink
                to="/softskills/training/reading"
                className={({ isActive }) =>
                  `${isActive ? "app-sidebar__active" : ""} ${!isLearningCompleted ? "app-sidebar__disabled" : ""}`
                }
                onClick={handleTrainingClick}
              >
                Reading Practice{" "}
                <span className="averagescore">
                  {"Score: "}
                  {overallReadingAverage ? overallReadingAverage.toFixed(2) : "0.00"}
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/training/listening"
                className={({ isActive }) =>
                  `${isActive ? "app-sidebar__active" : ""} ${!isLearningCompleted ? "app-sidebar__disabled" : ""}`
                }
                onClick={handleTrainingClick}
              >
                Listening &amp; Writing{" "}
                <span className="averagescore">
                  {"Score: "}
                  {overallListeningAverage ? overallListeningAverage.toFixed(2) : "0.00"}
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/softskills/training/speaking"
                className={({ isActive }) =>
                  `${isActive ? "app-sidebar__active" : ""} ${!isLearningCompleted ? "app-sidebar__disabled" : ""}`
                }
                onClick={handleTrainingClick}
              >
                Speaking Practice{" "}
                <span className="averagescore">
                  {"Score: "}
                  {overallSpeakingAverage ? overallSpeakingAverage.toFixed(2) : "0.00"}
                </span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );

  const renderSalesSidebar = () => (
    <>
      <div className="app-sidebar__header">
        <h2>Sales Skills</h2>
        <div className="sidebar-debug">
          <small>
            Last refreshed: {new Date(lastRefresh).toLocaleTimeString()}
          </small>
          <small className="completion-status">
            Learning completed: {isLearningCompleted ? "✓" : "✗"}
          </small>
        </div>
      </div>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Learning</h3>
          <ul className="app-sidebar__nav-links">
            <li>
              <NavLink
                to="/sales/learning/introduction"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Introduction {getCompletionStatus("introduction")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/sales/learning/telecalling"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Tele-calling {getCompletionStatus("telecalling")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/sales/learning/skills-needed"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Skills Needed {getCompletionStatus("skills-needed")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/sales/learning/telecalling-module"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Tele-calling Module {getCompletionStatus("telecalling-module")}
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Training</h3>
          {!isLearningCompleted && (
            <div className="app-sidebar__locked-message">
              <span className="app-sidebar__lock-icon">🔒</span>
              <span>Complete all learning modules first</span>
            </div>
          )}
          <ul className={`app-sidebar__nav-links ${!isLearningCompleted ? "app-sidebar__locked" : ""}`}>
            <li>
              <NavLink
                to="/sales/training/speaking"
                className={({ isActive }) =>
                  `${isActive ? "app-sidebar__active" : ""} ${!isLearningCompleted ? "app-sidebar__disabled" : ""}`
                }
                onClick={handleTrainingClick}
              >
                Speaking Practice{" "}
                <span className="averagescore">
                  {"Score: "}
                  {overallSalesSpeakingAverage ? overallSalesSpeakingAverage.toFixed(2) : "0.00"}
                </span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );

  const renderProductSidebar = () => (
    <>
      <div className="app-sidebar__header">
        <h2>Product Skills</h2>
        <div className="sidebar-debug">
          <small>
            Last refreshed: {new Date(lastRefresh).toLocaleTimeString()}
          </small>
          <small className="completion-status">
            Learning completed: {isLearningCompleted ? "✓" : "✗"}
          </small>
        </div>
      </div>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Learning</h3>
          <ul className="app-sidebar__nav-links">
            <li>
              <NavLink
                to="/product/learning/bank-terminologies"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Bank Terminologies {getCompletionStatus("bank-terminologies")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/product/learning/casa-kyc"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                CASA + KYC {getCompletionStatus("casa-kyc")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/product/learning/personal-loans"
                className={({ isActive }) =>
                  isActive ? "app-sidebar__active" : ""
                }
              >
                Personal Loans {getCompletionStatus("personal-loans")}
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="app-sidebar__nav-section">
          <h3 className="app-sidebar__section-title">Training</h3>
          {!isLearningCompleted && (
            <div className="app-sidebar__locked-message">
              <span className="app-sidebar__lock-icon">🔒</span>
              <span>Complete all learning modules first</span>
            </div>
          )}
          <ul className={`app-sidebar__nav-links ${!isLearningCompleted ? "app-sidebar__locked" : ""}`}>
            <li>
              <NavLink
                to="/product/qa/mcq"
                className={({ isActive }) =>
                  `${isActive ? "app-sidebar__active" : ""} ${
                    !isLearningCompleted ? "app-sidebar__disabled" : ""
                  }`
                }
                onClick={handleTrainingClick}
              >
                MCQ Training{" "}
                <span className="averagescore">
                  {"Score: "}
                  {overallMCQAverage ? overallMCQAverage.toFixed(2) : "0.00"}
                </span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );

  const renderSidebarContent = () => {
    if (skillType === "softskills") return renderSoftSkillsSidebar();
    if (skillType === "sales") return renderSalesSidebar();
    if (skillType === "product") return renderProductSidebar();
    return renderSoftSkillsSidebar();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? "open" : "app-sidebar__closed"}`}>
      {error && <div className="error-message">{error}</div>}
      {renderSidebarContent()}
    </aside>
  );
};

export default Sidebar;
