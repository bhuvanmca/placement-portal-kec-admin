import React, { useState } from 'react';
import './Login.css';
import { useAuth } from '../context/AuthContext';
import kecLogo from '../assets/kec-logo.png';

const Login = ({ onSwitchToSignup }) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        console.log('Attempting login with:', { email: formData.email, password: '***' });
        await login(formData);
        // Login successful - user will be redirected by App component
        console.log('Login successful!');
      } catch (error) {
        console.error('Login failed:', error);
        setErrors({
          email: error.message || 'Login failed. Please check your credentials and try again.',
          password: ''
        });
      }
    }
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@kec.edu',
      password: 'demo123'
    });
    // Clear any existing errors
    setErrors({});
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src={kecLogo} alt="KEC Logo" className="logo-image" />
            <h1>KEC Drives</h1>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to access your placement portal</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope input-icon"></i>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@college.edu"
                className={errors.email ? 'error' : ''}
                autoComplete="email"
              />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <i className="fas fa-lock input-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className={errors.password ? 'error' : ''}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-options">
            <label className="checkbox-wrapper">
              <input type="checkbox" />
              Remember me
            </label>
            <button type="button" className="forgot-password" onClick={() => alert('Password reset feature coming soon!')}>
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Sign In to Portal
              </>
            )}
          </button>

          <div className="divider">
            <span>SECURE DEMO ACCESS</span>
          </div>

          <button
            type="button"
            className="auth-button demo"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            <i className="fas fa-bolt"></i>
            Quick Login (Demo)
          </button>
        </form>


      </div>
    </div>
  );
};

export default Login;
