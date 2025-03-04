import Dashboard from "./Components/Dashboard/Dashboard";
import LandingPage from "./Components/LandingPage/LandingPage"
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReportPage from "./Components/ReportPage/ReportPage";
import HomePage from "./Components/HomePage/HomePage";
import Task1 from "./Components/Task1/Task1";
import ListedReport from "./Components/ListedReports/ListedReport";
import BotPage from "./Components/BotPage/BotPage";
import Admin from "./Components/AdminDashboard/Admin";
import SuperAdmin from "./Components/SuperAdmin/SuperAdmin";
import LearnMore from "./Components/LearnMore/LearnMore";
import RequestDemo from "./Components/RequestDemo/RequestDemo";
import Announcement from "./Components/Announcement/Announcement";
import ProfilePage from "./Components/ProfilePage/ProfilePage";
import Credentials from "./Components/CredentialsPage/Credentials";
import Module from "./Components/ModulesPage/Module";
import Leaderboard from "./Components/LeaderBoard/Leaderboard";
import Elearning from "./Components/ElearningPage/Elearning";
import TrainigPage from "./TrainingDashboard/RoleplayPage/TrainigPage";
import AdminPannel from "./Pannels/AdminPannel/AdminPannel";
import SuperAdminPannel from "./Pannels/superAdminPannel/SuperAdminPannel";
import Layout from './components/Layout/Layout';
import LearningPage from './Components/Learning/LearningPage';
import ReadingTraining from './Components/Training/ReadingTraining';
import ListeningTraining from './Components/Training/ListeningTraining';
import SpeakingTraining from './Components/Training/SpeakingTraining';
import SalesLearningPage from './Components/Sales/SalesLearningPage';
import SalesSpeakingTraining from './Components/Sales/SalesSpeakingTraining';
import ProductLearningPage from './Components/Product/ProductLearningPage';
import ProductMCQTraining from './Components/Product/ProductMCQTraining';


function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/announcement" element={<Announcement/>} />
          <Route path="/report" element={<ReportPage/>} />
          <Route path="/task1" element={<Task1/>} />
          <Route path="/reportlist/:userId" element={<ListedReport/>} />
          <Route path="/botpage" element={<BotPage/>} />
          <Route path="/admin" element={<Admin/>} />
          <Route path="/superadmin" element={<SuperAdmin/>} />
          <Route path="/learnmore" element={<LearnMore/>} />
          <Route path="/requestdemo" element={<RequestDemo/>} />
          <Route path="/profile/:userId" element={<ProfilePage/>} />
          <Route path="/creditianls" element={<Credentials/>} />
          <Route path="/modules/:userId" element={<Module/>}/>
          <Route path="/leaderboard" element={<Leaderboard/>} />
          <Route path="/elearning" element={<Elearning/>} />
          <Route path="/userTraining" element={<TrainigPage/>} />
          <Route path="/adminPannel/:adminName" element={<AdminPannel/>} />
          <Route path="/superadminPannel" element={<SuperAdminPannel />} />
          <Route
            path="/softskills/*"
            element={
            <Layout skillType="softskills">
              <Routes>
                <Route path="learning/:topic" element={<LearningPage />} />
                <Route path="training/reading" element={<ReadingTraining />} />
                <Route path="training/listening" element={<ListeningTraining />} />
                <Route path="training/speaking" element={<SpeakingTraining />} />
                <Route path="*" element={<Navigate to="/softskills/learning/parts-of-speech" replace />} />
              </Routes>
            </Layout>
            }
          />
          <Route
            path="/sales/*"
            element={
            <Layout skillType="sales">
              <Routes>
                <Route path="learning/:topic" element={<SalesLearningPage />} />
                <Route path="training/speaking" element={<SalesSpeakingTraining />} />
                <Route path="*" element={<Navigate to="/sales/learning/introduction" replace />} />
              </Routes>
            </Layout>
          }
          />
          <Route
            path="/product/*"
            element={
            <Layout skillType="product">
              <Routes>
                <Route path="learning/:topic" element={<ProductLearningPage />} />
                <Route path="qa/mcq" element={<ProductMCQTraining />} />
                <Route path="*" element={<Navigate to="/product/learning/bank-terminologies" replace />} />
              </Routes>
            </Layout>
          }
          />
          
        </Routes>
      </Router>
    </>
  );
}

export default App;
