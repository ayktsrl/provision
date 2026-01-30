
import React, { useState } from 'react';
import { UserProfile, UserRole } from './types';
import Login from './components/Login';
import CompanySignup from './components/CompanySignup';
import CompanyDashboard from './components/CompanyDashboard';
import VesselDashboard from './components/VesselDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('login');

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setCurrentPage(profile.role === UserRole.COMPANY ? 'company-dashboard' : 'vessel-dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  const renderContent = () => {
    if (currentPage === 'signup') {
      return (
        <CompanySignup 
          onSignup={handleLogin} 
          onBack={() => setCurrentPage('login')} 
        />
      );
    }

    if (!user) {
      return (
        <Login 
          onLogin={handleLogin} 
          onNavigateToSignup={() => setCurrentPage('signup')} 
        />
      );
    }

    if (user.role === UserRole.COMPANY) {
      return <CompanyDashboard user={user} onLogout={handleLogout} />;
    }

    if (user.role === UserRole.VESSEL) {
      return <VesselDashboard user={user} onLogout={handleLogout} />;
    }

    return <div>404 Not Found</div>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderContent()}
    </div>
  );
};

export default App;
