import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ReportPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const reportData = location.state?.reportData;

    if (!reportData) {
        return <div>No report available.</div>;
    }

    return (
        <div className="report-container">
            <h1>Call Report</h1>
            <p><strong>Summary:</strong> {reportData.summary}</p>
            <p><strong>Behavior Type:</strong> {reportData.behaviorType}</p>
            <p><strong>Selected Scenario:</strong> {reportData.selectedScenario}</p>
            <h3>Chat History:</h3>
            <pre>{reportData.chatHistory}</pre>
            <h3>Evaluation:</h3>
            <pre>{reportData.response}</pre>
            <h3>Feedback:</h3>
            <p>{reportData.feedback}</p>
            <button onClick={() => navigate('/userTraining')}>Back to Training</button>
        </div>
    );
};

export default ReportPage;
