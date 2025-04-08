import Dashboard from "./Components/Dashboard/Dashboard";
import LandingPage from "./Components/LandingPage/LandingPage";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from "./Components/HomePage/HomePage";
import ListedReport from "./Components/ListedReports/ListedReport";
import LearnMore from "./Components/LearnMore/LearnMore";
import RequestDemo from "./Components/RequestDemo/RequestDemo";
import ProfilePage from "./Components/ProfilePage/ProfilePage";
import Credentials from "./Components/CredentialsPage/Credentials";
import Leaderboard from "./Components/LeaderBoard/Leaderboard";
import Elearning from "./Components/ElearningPage/Elearning";
import AdminPannel from "./Pannels/AdminPannel/AdminPannel";
import Layout from './CoursePlatform/CourseLayout/Layout';
import LearningPage from './CoursePlatform/Learning/LearningPage';
import ReadingTraining from './CoursePlatform/TrainingComponent/ReadingTraining';
import ListeningTraining from './CoursePlatform/TrainingComponent/ListeningTraining';
import SpeakingTraining from './CoursePlatform/TrainingComponent/SpeakingTraining';
import SalesLearningPage from './CoursePlatform/Sales/SalesLearningPage';
import SalesSpeakingTraining from './CoursePlatform/Sales/SalesSpeakingTraining';
import ProductLearningPage from './CoursePlatform/Product/ProductLearningPage';
import ProductMCQTraining from './CoursePlatform/Product/ProductMCQTraining';
import ProgressLoader from './CoursePlatform/common/ProgressLoader';
import ScenarioPageBot from './RetailBot/pages/ScenarioPage';
import TrainingPageBot from './RetailBot/pages/TrainingPage';
import ReportPageBot from './RetailBot/pages/ReportPage';


function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reportlist" element={<ListedReport/>} />
          <Route path="/learnmore" element={<LearnMore/>} />
          <Route path="/requestdemo" element={<RequestDemo/>} />
          <Route path="/profile" element={<ProfilePage/>} />
          <Route path="/creditianls" element={<Credentials/>} />
          <Route path="/leaderboard" element={<Leaderboard/>} />
          <Route path="/elearning" element={<Elearning/>} />
          <Route path="/adminPannel/:adminName" element={<AdminPannel/>} />
          <Route path="/userTraining" element={<ScenarioPageBot />} />
          <Route path="/training/:scenarioId" element={<TrainingPageBot />} />
           <Route path="/report/:conversationId" element={<ReportPageBot />} />
          
          {/* Wrap learning/training routes with ProgressLoader */}
          <Route
            path="/softskills/*"
            element={
              <ProgressLoader>
                <Layout skillType="softskills">
                  <Routes>
                    <Route path="learning/:topic" element={<LearningPage />} />
                    <Route path="training/reading" element={<ReadingTraining />} />
                    <Route path="training/listening" element={<ListeningTraining />} />
                    <Route path="training/speaking" element={<SpeakingTraining />} />
                    <Route path="*" element={<Navigate to="/softskills/learning/parts-of-speech" replace />} />
                  </Routes>
                </Layout>
              </ProgressLoader>
            }
          />
          
          <Route
            path="/sales/*"
            element={
              <ProgressLoader>
                <Layout skillType="sales">
                  <Routes>
                    <Route path="learning/:topic" element={<SalesLearningPage />} />
                    <Route path="training/speaking" element={<SalesSpeakingTraining />} />
                    <Route path="*" element={<Navigate to="/sales/learning/introduction" replace />} />
                  </Routes>
                </Layout>
              </ProgressLoader>
            }
          />
          
          <Route
            path="/product/*"
            element={
              <ProgressLoader>
                <Layout skillType="product">
                  <Routes>
                    <Route path="learning/:topic" element={<ProductLearningPage />} />
                    <Route path="qa/mcq" element={<ProductMCQTraining />} />
                    <Route path="*" element={<Navigate to="/product/learning/bank-terminologies" replace />} />
                  </Routes>
                </Layout>
              </ProgressLoader>
            }
          />
          
        </Routes>
      </Router>
    </>
  );
}

export default App;