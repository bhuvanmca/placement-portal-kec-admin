import React from 'react';
import './screens.css';

const Dashboard = () => {
  return (
    <div className="dashboard-screen">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your placement portal dashboard</p>
      </div>
      
      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Applications</h3>
            <p className="stat-number">12</p>
            <span className="stat-label">Total Applications</span>
          </div>
          
          <div className="stat-card">
            <h3>Interviews</h3>
            <p className="stat-number">5</p>
            <span className="stat-label">Scheduled</span>
          </div>
          
          <div className="stat-card">
            <h3>Offers</h3>
            <p className="stat-number">2</p>
            <span className="stat-label">Received</span>
          </div>
          
          <div className="stat-card">
            <h3>Companies</h3>
            <p className="stat-number">8</p>
            <span className="stat-label">Applied to</span>
          </div>
        </div>
        
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-date">Today</span>
              <span className="activity-text">Applied to Software Engineer position at TechCorp</span>
            </div>
            <div className="activity-item">
              <span className="activity-date">Yesterday</span>
              <span className="activity-text">Interview scheduled with DataSoft Solutions</span>
            </div>
            <div className="activity-item">
              <span className="activity-date">2 days ago</span>
              <span className="activity-text">Profile updated with new skills</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;