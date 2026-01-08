import React, { useState } from 'react';
import './Header.css';
import { useForm } from '../context/FormContext';
import { useAuth } from '../context/AuthContext';
import kecLogo from '../assets/kec-logo.png';

const Header = () => {
  const { validateForm, state } = useForm();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSaveAndProceed = () => {
    const isValid = validateForm();
    if (isValid) {
      alert('Form submitted successfully!');
      console.log('Form data:', state);
    } else {
      alert('Please fill in all required fields correctly.');
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo-section">
          <img src={kecLogo} alt="KEC Logo" className="portal-logo" />
        </div>
        <div className="breadcrumbs">
          <span className="breadcrumb-main">Drives</span>
          <span className="breadcrumb-separator"><i className="fas fa-chevron-right"></i></span>
          <span className="breadcrumb-company">{state.companyInformation.companyName || 'New Drive'}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="search-bar-wrapper">
          <div className="search-input-group">
            <i className="fas fa-search search-icon-main"></i>
            <input
              type="text"
              placeholder="Search..."
              className="global-search-input"
            />
            <span className="search-shortcut">Ctrl + K</span>
          </div>
        </div>

        <div className="header-actions">
          <div className="notification-wrapper">
            <i className="far fa-bell notification-bell"></i>
          </div>

          <div className="user-profile-trigger" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="avatar-circle">
              <img src="https://i.pravatar.cc/150?u=admin@kec.edu" alt="User" />
            </div>
            <span className="user-display-name">{user?.name || 'Kongu Placement'}</span>
            <i className="fas fa-chevron-down profile-arrow"></i>

            {showDropdown && (
              <div className="header-dropdown-menu">
                <div className="menu-item">Profile</div>
                <div className="menu-item">Settings</div>
                <div className="menu-divider"></div>
                <div className="menu-item logout-link" onClick={handleLogout}>Logout</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;