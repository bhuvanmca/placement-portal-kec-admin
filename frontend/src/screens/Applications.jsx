import React, { useState } from 'react';
import './screens.css';

const Applications = () => {
  const [applications] = useState([
    {
      id: 1,
      company: 'TechCorp Solutions',
      position: 'Software Engineer',
      appliedDate: '2025-09-15',
      status: 'Under Review',
      statusColor: 'orange'
    },
    {
      id: 2,
      company: 'DataSoft Inc.',
      position: 'Frontend Developer',
      appliedDate: '2025-09-12',
      status: 'Interview Scheduled',
      statusColor: 'blue'
    },
    {
      id: 3,
      company: 'CloudTech Systems',
      position: 'Full Stack Developer',
      appliedDate: '2025-09-10',
      status: 'Offer Received',
      statusColor: 'green'
    },
    {
      id: 4,
      company: 'StartupXYZ',
      position: 'React Developer',
      appliedDate: '2025-09-08',
      status: 'Rejected',
      statusColor: 'red'
    },
    {
      id: 5,
      company: 'Enterprise Solutions',
      position: 'Backend Developer',
      appliedDate: '2025-09-05',
      status: 'Applied',
      statusColor: 'gray'
    }
  ]);

  const [filter, setFilter] = useState('all');

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="applications-screen">
      <div className="applications-header">
        <h1>My Applications</h1>
        <div className="applications-stats">
          <span>Total: {applications.length}</span>
          <span>Active: {applications.filter(app => !['Rejected', 'Offer Received'].includes(app.status)).length}</span>
        </div>
      </div>

      <div className="applications-filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Applications
        </button>
        <button 
          className={filter === 'under review' ? 'active' : ''}
          onClick={() => setFilter('under review')}
        >
          Under Review
        </button>
        <button 
          className={filter === 'interview' ? 'active' : ''}
          onClick={() => setFilter('interview')}
        >
          Interviews
        </button>
        <button 
          className={filter === 'offer' ? 'active' : ''}
          onClick={() => setFilter('offer')}
        >
          Offers
        </button>
      </div>

      <div className="applications-list">
        {filteredApplications.map(application => (
          <div key={application.id} className="application-card">
            <div className="application-header">
              <h3>{application.position}</h3>
              <span 
                className={`status-badge ${application.statusColor}`}
              >
                {application.status}
              </span>
            </div>
            
            <div className="application-details">
              <p className="company-name">{application.company}</p>
              <p className="applied-date">Applied: {application.appliedDate}</p>
            </div>
            
            <div className="application-actions">
              <button className="view-btn">View Details</button>
              <button className="edit-btn">Edit Application</button>
            </div>
          </div>
        ))}
      </div>

      {filteredApplications.length === 0 && (
        <div className="no-applications">
          <p>No applications found for the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default Applications;