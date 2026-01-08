import React, { useState } from 'react';
import './screens.css';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@university.edu',
    phone: '+1 234-567-8900',
    university: 'Tech University',
    degree: 'Computer Science',
    year: '2025',
    gpa: '3.8',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
    resume: 'john_doe_resume.pdf'
  });

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to backend
    console.log('Profile saved:', profile);
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <h1>My Profile</h1>
        <button 
          className="edit-btn"
          onClick={isEditing ? handleSave : handleEdit}
        >
          {isEditing ? 'Save' : 'Edit Profile'}
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label>Full Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              ) : (
                <span>{profile.name}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Email</label>
              {isEditing ? (
                <input 
                  type="email" 
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              ) : (
                <span>{profile.email}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Phone</label>
              {isEditing ? (
                <input 
                  type="tel" 
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              ) : (
                <span>{profile.phone}</span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Academic Information</h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label>University</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profile.university}
                  onChange={(e) => handleChange('university', e.target.value)}
                />
              ) : (
                <span>{profile.university}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Degree</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profile.degree}
                  onChange={(e) => handleChange('degree', e.target.value)}
                />
              ) : (
                <span>{profile.degree}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Graduation Year</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profile.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                />
              ) : (
                <span>{profile.year}</span>
              )}
            </div>

            <div className="profile-field">
              <label>GPA</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profile.gpa}
                  onChange={(e) => handleChange('gpa', e.target.value)}
                />
              ) : (
                <span>{profile.gpa}</span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Skills</h3>
          <div className="skills-container">
            {profile.skills.map((skill, index) => (
              <span key={index} className="skill-tag">{skill}</span>
            ))}
            {isEditing && (
              <button className="add-skill-btn">+ Add Skill</button>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h3>Resume</h3>
          <div className="resume-section">
            <span className="resume-file">{profile.resume}</span>
            {isEditing && (
              <button className="upload-btn">Upload New Resume</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;