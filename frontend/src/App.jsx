import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { Login, Signup } from './screens';
import { FormProvider } from './context/FormContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Main app component that handles authenticated state
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState('company-information');
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        {authView === 'login' ? (
          <Login onSwitchToSignup={() => setAuthView('signup')} />
        ) : (
          <Signup onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <FormProvider>
      <div className="app">
        <Header />
        <div className="app-body">
          <Sidebar />
          <MainContent 
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
        </div>
      </div>
    </FormProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
